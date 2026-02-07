import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, url as getUrl } from '@nuxt/test-utils/e2e'
import {
  extractCodeFromUrl,
  exchangeCodeForTokens,
  accessProtectedRoute,
  decodeJwt,
} from './helpers/mockAuth'

/**
 * Minimal E2E Test — exercises the complete nuxt-aegis flow with minimal fixture code.
 *
 * What makes this different from other test fixtures:
 * - Route protection via Nitro routeRules (nuxtAegis: { auth: true }) — the module's
 *   intended mechanism, not manual jose JWT verification
 * - Uses getAuthUser() in the protected API (auto-imported module utility)
 * - Includes a defineAegisHandler() server plugin with onUserPersist
 * - The Vue page uses useAuth() + useNuxtApp().$api for authenticated calls
 *
 * Tested flow:
 *   /auth/mock → mock OAuth → /auth/callback?code=<aegis_code>
 *   POST /auth/token (exchange code) → JWT access token + refresh cookie
 *   GET /api/profile (with Bearer token) → user data
 *   POST /auth/refresh (with cookie) → new access token
 *   POST /auth/logout → session cleared
 */
describe('Minimal E2E — Full Auth Flow', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/minimal-e2e', import.meta.url)),
    dev: true,
  })

  // --- Helpers ---

  /** Run the complete 4-step OAuth redirect chain and return the aegis CODE */
  async function completeOAuthFlow(): Promise<string> {
    const baseUrl = getUrl('/')

    // Step 1: Navigate to /auth/mock → redirects to /auth/mock/authorize
    const authResp = await fetch(`${baseUrl}auth/mock`, { redirect: 'manual' })
    expect(authResp.status).toBe(302)
    const authorizeUrl = authResp.headers.get('location')!

    // Step 2: Mock authorize auto-approves → redirects back with provider code
    const authorizeResp = await fetch(authorizeUrl, { redirect: 'manual' })
    expect(authorizeResp.status).toBe(302)
    const callbackWithProviderCode = authorizeResp.headers.get('location')!

    // Step 3: Handler exchanges provider code → generates aegis CODE → redirects to /auth/callback
    const exchangeResp = await fetch(callbackWithProviderCode, { redirect: 'manual' })
    expect(exchangeResp.status).toBe(302)
    const callbackUrl = exchangeResp.headers.get('location')!

    const code = extractCodeFromUrl(callbackUrl)
    expect(code).toBeTruthy()
    return code!
  }

  /** Exchange CODE and return { accessToken, refreshToken } */
  async function loginAndGetTokens() {
    const code = await completeOAuthFlow()
    const baseUrl = getUrl('/')

    // Use raw fetch so we can read Set-Cookie header for the refresh token
    const tokenResp = await fetch(`${baseUrl}auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    expect(tokenResp.status).toBe(200)
    const data = await tokenResp.json() as { accessToken: string }
    const setCookie = tokenResp.headers.get('set-cookie')
    const refreshToken = setCookie?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]

    return {
      accessToken: data.accessToken,
      refreshToken: refreshToken!,
      setCookie,
    }
  }

  // --- Tests ---

  describe('Page Rendering', () => {
    it('should render the index page with auth status', async () => {
      const html = await $fetch('/')
      expect(html).toContain('Minimal E2E')
      expect(html).toContain('unauthenticated')
    })
  })

  describe('Route Protection (via routeRules)', () => {
    it('should return 401 for /api/profile without a token', async () => {
      try {
        await $fetch('/api/profile')
        // Should not reach here
        expect.unreachable('Expected 401')
      }
      catch (error: unknown) {
        const err = error as { response?: { status?: number } }
        expect(err.response?.status).toBe(401)
      }
    })

    it('should return 401 for /api/profile with an invalid token', async () => {
      try {
        await accessProtectedRoute($fetch, '/api/profile', {
          accessToken: 'invalid.jwt.token',
        })
        expect.unreachable('Expected 401')
      }
      catch (error: unknown) {
        const err = error as { response?: { status?: number } }
        expect(err.response?.status).toBe(401)
      }
    })
  })

  describe('OAuth Login Flow', () => {
    it('should redirect through mock OAuth and produce an aegis CODE', async () => {
      const code = await completeOAuthFlow()
      expect(code).toMatch(/^[\w-]+$/)
    })

    it('should exchange CODE for a valid JWT access token', async () => {
      const code = await completeOAuthFlow()
      const tokenResponse = await exchangeCodeForTokens($fetch, code)

      expect(tokenResponse.accessToken).toBeDefined()
      const payload = decodeJwt(tokenResponse.accessToken as string)

      expect(payload.sub).toBe('mock-user-001')
      expect(payload.email).toBe('user@test.com')
      expect(payload.name).toBe('Test User')
      expect(payload.role).toBe('member')
    })

    it('should set an HttpOnly refresh token cookie', async () => {
      const { setCookie } = await loginAndGetTokens()

      expect(setCookie).toContain('nuxt-aegis-refresh=')
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite')
    })
  })

  describe('Protected API Access', () => {
    it('should allow access to /api/profile with a valid token', async () => {
      const { accessToken } = await loginAndGetTokens()

      const profile = await accessProtectedRoute($fetch, '/api/profile', {
        accessToken,
      }) as { user: Record<string, unknown> }

      expect(profile.user).toBeDefined()
      expect(profile.user.sub).toBe('mock-user-001')
      expect(profile.user.email).toBe('user@test.com')
      expect(profile.user.name).toBe('Test User')
      expect(profile.user.role).toBe('member')
    })
  })

  describe('Token Refresh', () => {
    it('should issue a new access token using the refresh cookie', async () => {
      const { accessToken, refreshToken } = await loginAndGetTokens()

      // Small delay so the new token has a different iat
      await new Promise(resolve => setTimeout(resolve, 1100))

      const refreshResp = await fetch(getUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          Cookie: `nuxt-aegis-refresh=${refreshToken}`,
          Authorization: `Bearer ${accessToken}`,
        },
      })

      expect(refreshResp.status).toBe(200)
      const data = await refreshResp.json() as { accessToken: string }
      expect(data.accessToken).toBeDefined()
      expect(data.accessToken).not.toBe(accessToken)

      // New token should carry the same user
      const payload = decodeJwt(data.accessToken)
      expect(payload.sub).toBe('mock-user-001')
      expect(payload.email).toBe('user@test.com')
    })
  })

  describe('Logout', () => {
    it('should clear the refresh cookie on logout', async () => {
      const { refreshToken } = await loginAndGetTokens()

      const logoutResp = await fetch(getUrl('/auth/logout'), {
        method: 'POST',
        headers: {
          Cookie: `nuxt-aegis-refresh=${refreshToken}`,
        },
      })

      expect(logoutResp.status).toBe(200)

      // The response should set the cookie to expire (clear it)
      const setCookie = logoutResp.headers.get('set-cookie')
      // Cookie is either deleted (Max-Age=0 / Expires in the past) or emptied out
      expect(setCookie).toContain('nuxt-aegis-refresh=')
    })
  })
})
