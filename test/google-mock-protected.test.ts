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
 * E2E Tests for Protected Routes and Token Refresh
 *
 * These tests verify:
 * - Protected routes deny access without tokens
 * - Protected routes allow access with valid tokens
 * - Token refresh functionality (TR-1 through TR-7)
 * - Token rotation on refresh
 */
describe('Aegis Module - Protected Routes & Token Refresh', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/google-mock', import.meta.url)),
    dev: true,
  })

  describe('Protected Routes', () => {
    it('should deny access to protected route without token', async () => {
      // Attempt to access protected route without Authorization header
      await expect(
        $fetch('/api/profile'),
      ).rejects.toThrow()

      try {
        await $fetch('/api/profile')
      }
      catch (error: unknown) {
        const err = error as { response?: { status?: number } }
        expect(err.response?.status).toBe(401)
      }
    })

    it('should allow access to protected route with valid token', async () => {
      // Complete OAuth flow to get access token
      const authResponse = await fetch(getUrl('/auth/google'), { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!

      const tokenResponse = await exchangeCodeForTokens($fetch, aegisCode)
      const accessToken = tokenResponse.accessToken as string

      // Access protected route with token
      const profile = await accessProtectedRoute($fetch, '/api/profile', {
        accessToken,
      }) as { authenticated: boolean, user: Record<string, unknown> }

      expect(profile.authenticated).toBe(true)
      expect(profile.user).toBeDefined()
      expect(profile.user.email).toBe('test@example.com')
      expect(profile.user.name).toBe('Test User')
      expect(profile.user.role).toBe('user')
      expect(profile.user.permissions).toEqual(['read', 'write'])
    })

    it('should reject requests with invalid token', async () => {
      const invalidToken = 'invalid.jwt.token'

      await expect(
        accessProtectedRoute($fetch, '/api/profile', {
          accessToken: invalidToken,
        }),
      ).rejects.toThrow()
    })

    it('should reject requests with malformed Authorization header', async () => {
      // Test without 'Bearer ' prefix
      await expect(
        $fetch('/api/profile', {
          headers: {
            Authorization: 'not-a-bearer-token',
          },
        }),
      ).rejects.toThrow()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh access token using refresh token cookie (TR-1)', async () => {
      // Get tokens from initial login
      const authResponse = await fetch(getUrl('/auth/google'), { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!

      const tokenResponse = await fetch(getUrl('/auth/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: aegisCode }),
      })

      const originalData = await tokenResponse.json()
      const originalAccessToken = originalData.accessToken as string
      const setCookie = tokenResponse.headers.get('set-cookie')
      const refreshToken = setCookie?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]

      expect(refreshToken).toBeDefined()

      // Wait a moment to ensure new token will have different iat
      await new Promise(resolve => setTimeout(resolve, 1000))

      // TR-1: Refresh the access token
      const refreshResponse = await fetch(getUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          Cookie: `nuxt-aegis-refresh=${refreshToken}`,
          Authorization: `Bearer ${originalAccessToken}`,
        },
      })

      // TR-2: Should return new access token
      const newData = await refreshResponse.json()
      const newAccessToken = newData.accessToken as string
      expect(newAccessToken).toBeDefined()
      expect(newAccessToken).not.toBe(originalAccessToken)

      // Verify new token is valid and has updated timestamp
      const originalPayload = decodeJwt(originalAccessToken)
      const newPayload = decodeJwt(newAccessToken)

      expect(newPayload.sub).toBe(originalPayload.sub)
      expect(Number(newPayload.iat)).toBeGreaterThan(Number(originalPayload.iat))
    })

    it('should rotate refresh token on refresh (TR-5)', async () => {
      // Get initial tokens
      const authResponse = await fetch(getUrl('/auth/google'), { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!

      const tokenResponse = await fetch(getUrl('/auth/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: aegisCode }),
      })

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.accessToken as string
      const setCookie1 = tokenResponse.headers.get('set-cookie')
      const refreshToken1 = setCookie1?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]

      // Refresh token
      const refreshResponse = await fetch(getUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          Cookie: `nuxt-aegis-refresh=${refreshToken1}`,
          Authorization: `Bearer ${accessToken}`,
        },
      })

      // TR-5: Should get new refresh token
      const setCookie2 = refreshResponse.headers.get('set-cookie')
      const refreshToken2 = setCookie2?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]

      expect(refreshToken2).toBeDefined()
      expect(refreshToken2).not.toBe(refreshToken1)
    })

    it('should reject refresh without refresh token cookie', async () => {
      const refreshResponse = await fetch(getUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer fake-token',
        },
      })

      expect(refreshResponse.status).toBe(401)
    })

    it('should reject refresh with invalid refresh token', async () => {
      const refreshResponse = await fetch(getUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          Cookie: 'nuxt-aegis-refresh=invalid-token',
          Authorization: 'Bearer fake-token',
        },
      })

      expect(refreshResponse.status).toBe(401)
    })
  })

  describe('End-to-End Flow', () => {
    it('should complete full authentication and authorization flow', async () => {
      // 1. Start OAuth flow
      const authResponse = await fetch(getUrl('/auth/google'), { redirect: 'manual' })
      expect(authResponse.status).toBe(302)

      // 2. Mock Google authorizes
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      expect(mockAuthorizeResponse.status).toBe(302)

      // 3. Aegis processes OAuth callback
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      expect(finalResponse.status).toBe(302)

      // 4. Get Aegis CODE
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!
      expect(aegisCode).toBeDefined()

      // 5. Exchange CODE for JWT tokens
      const tokenResponse = await exchangeCodeForTokens($fetch, aegisCode)
      const accessToken = tokenResponse.accessToken as string
      expect(accessToken).toBeDefined()

      // 6. Access protected resource
      const profile = await accessProtectedRoute($fetch, '/api/profile', {
        accessToken,
      }) as { authenticated: boolean, user: Record<string, unknown> }
      expect(profile.authenticated).toBe(true)
      expect(profile.user.email).toBe('test@example.com')

      // 7. Verify JWT contains expected claims
      const payload = decodeJwt(accessToken)
      expect(payload.sub).toBe('mock-user-12345')
      expect(payload.email).toBe('test@example.com')
      expect(payload.role).toBe('user')
      expect(payload.permissions).toEqual(['read', 'write'])
    })
  })
})
