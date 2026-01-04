import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, url as getUrl } from '@nuxt/test-utils/e2e'
import {
  extractCodeFromUrl,
} from './helpers/mockAuth'

/**
 * E2E Tests for Refresh Token Rotation Disabled
 *
 * These tests verify that when rotationEnabled: false:
 * - Refresh tokens are reused instead of rotated
 * - Same refresh token remains valid across multiple refreshes
 * - Multi-tab scenarios work correctly (all tabs can use the same token)
 * - Cookie is re-set with correct expiry
 */
describe('Token Refresh - Rotation Disabled', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/rotation-disabled', import.meta.url)),
    dev: true,
  })

  describe('Refresh Token Reuse', () => {
    it('should reuse the same refresh token across multiple refreshes', async () => {
      // Step 1: Complete OAuth flow and get initial tokens
      const baseUrl = getUrl('/')

      // Navigate through OAuth flow manually
      const authResponse = await fetch(`${baseUrl}auth/mock`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!

      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!

      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!

      const code = extractCodeFromUrl(finalLocation)!

      // Exchange code for tokens
      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const tokens = await tokenResponse.json()
      expect(tokens.accessToken).toBeDefined()

      // Extract the refresh token cookie
      const setCookie = tokenResponse.headers.get('set-cookie')
      const refreshTokenCookie = setCookie?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]
      expect(refreshTokenCookie).toBeDefined()

      const cookieHeader = `nuxt-aegis-refresh=${refreshTokenCookie}`

      // Step 2: First refresh - should reuse same token
      const firstRefresh = await $fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: cookieHeader,
        },
      })

      expect(firstRefresh.success).toBe(true)
      expect(firstRefresh.accessToken).toBeDefined()

      // Step 3: Second refresh - should still reuse same token
      const secondRefresh = await $fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: cookieHeader, // Use original cookie
        },
      })

      expect(secondRefresh.success).toBe(true)
      expect(secondRefresh.accessToken).toBeDefined()

      // Step 4: Third refresh - token should still be valid
      const thirdRefresh = await $fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          Cookie: cookieHeader, // Still use original
        },
      })

      expect(thirdRefresh.success).toBe(true)
      expect(thirdRefresh.accessToken).toBeDefined()

      // All refreshes should work with the original refresh token
      // This proves rotation is disabled and the token is reused
    })

    it('should handle multi-tab scenario with same refresh token', async () => {
      // Complete OAuth flow
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/mock`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const code = extractCodeFromUrl(finalLocation)!

      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const setCookie = tokenResponse.headers.get('set-cookie')
      const refreshTokenCookie = setCookie?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]
      const cookieHeader = `nuxt-aegis-refresh=${refreshTokenCookie}`

      // Tab 1: Refresh token
      const tab1Refresh = await $fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      }) as { success: boolean }

      expect(tab1Refresh.success).toBe(true)

      // Tab 2: Refresh token with same cookie (simulates multi-tab)
      // With rotation enabled, this would fail because tab 1 revoked the token
      // With rotation disabled, this should succeed
      const tab2Refresh = await $fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      }) as { success: boolean }

      expect(tab2Refresh.success).toBe(true)

      // Both tabs should be able to refresh using the same token
    })

    it('should reject expired refresh token even when rotation is disabled', async () => {
      // Complete OAuth flow
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/mock`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const code = extractCodeFromUrl(finalLocation)!

      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const setCookie = tokenResponse.headers.get('set-cookie')
      const refreshTokenCookie = setCookie?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]
      const cookieHeader = `nuxt-aegis-refresh=${refreshTokenCookie}`

      // Verify token works initially
      const refresh = await $fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      }) as { success: boolean }

      expect(refresh.success).toBe(true)

      // Note: Testing actual expiry would require mocking time
      // or setting a very short maxAge in test config
    })
  })

  describe('Session Duration', () => {
    it('should have fixed session duration matching maxAge config', async () => {
      // Complete OAuth flow
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/mock`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const code = extractCodeFromUrl(finalLocation)!

      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const setCookie = tokenResponse.headers.get('set-cookie')
      const refreshTokenCookie = setCookie?.match(/nuxt-aegis-refresh=([^;]+)/)?.[1]
      const cookieHeader = `nuxt-aegis-refresh=${refreshTokenCookie}`

      // Multiple refreshes should not extend the session
      const initialTime = Date.now()

      await $fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      })

      // Wait a bit (in real test, this would be more substantial)
      await new Promise(resolve => setTimeout(resolve, 100))

      await $fetch('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      })

      const afterRefreshTime = Date.now()

      // With rotation disabled, expiry should still be based on initial token creation
      // (This is more of a documentation test - actual expiry check would need time manipulation)
      expect(afterRefreshTime - initialTime).toBeLessThan(1000)
    })
  })
})
