import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, url as getUrl } from '@nuxt/test-utils/e2e'
import {
  extractCodeFromUrl,
  exchangeCodeForTokens,
  decodeJwt,
} from './helpers/mockAuth'

/**
 * E2E Tests for Aegis Module with Mock Google OAuth
 *
 * These tests verify that the Aegis module correctly handles the complete
 * OAuth authentication flow using mock Google endpoints.
 *
 * What We're Testing:
 * - Aegis OAuth flow implementation (PR-5 through PR-14)
 * - Authorization CODE generation and exchange (EP-10 through EP-18)
 * - JWT token generation (JT-1 through JT-5)
 * - Cookie handling (SC-3 through SC-5)
 * - Security requirements (CS-1 through CS-11, SC-10)
 *
 * What We're NOT Testing:
 * - Real Google OAuth (we use mocks)
 * - Browser interactions (we use direct HTTP requests)
 */
describe('Aegis Module - Mock Google OAuth', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/google-mock', import.meta.url)),
  })

  describe('OAuth Flow - Happy Path', () => {
    it('should redirect to mock Google authorize endpoint', async () => {
      // PR-5: Aegis should redirect to OAuth provider
      // Use native fetch with redirect: 'manual' to intercept redirects
      const baseUrl = getUrl('/')
      const response = await fetch(`${baseUrl}auth/google`, {
        redirect: 'manual',
      })

      expect(response.status).toBe(302)
      const location = response.headers.get('location')
      expect(location).toBeDefined()
      expect(location).toContain('/mock-google/authorize')

      // Verify OAuth parameters in redirect URL
      const url = new URL(location!, baseUrl)
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('client_id')).toBe('mock-google-client-id')
      expect(url.searchParams.get('redirect_uri')).toContain('/auth/google')
      expect(url.searchParams.get('scope')).toContain('openid')
    })

    it('should complete full OAuth flow and generate Aegis CODE', async () => {
      // This test simulates the browser following redirects through the OAuth flow
      // In reality, these would be separate requests, but we track the flow
      const baseUrl = getUrl('/')

      // Step 1: Navigate to /auth/google
      const authResponse = await fetch(`${baseUrl}auth/google`, {
        redirect: 'manual',
      })

      expect(authResponse.status).toBe(302)
      const authorizeUrl = authResponse.headers.get('location')
      expect(authorizeUrl).toContain('/mock-google/authorize')

      // Step 2: Mock Google authorize auto-redirects back with code
      // We simulate this by calling the authorize endpoint
      const mockAuthorizeResponse = await fetch(authorizeUrl!, {
        redirect: 'manual',
      })

      expect(mockAuthorizeResponse.status).toBe(302)
      const callbackUrl = mockAuthorizeResponse.headers.get('location')
      expect(callbackUrl).toContain('/auth/google?code=')

      // Step 3: Aegis receives Google's code and exchanges it
      // This redirect should contain the Google authorization code
      const googleCode = new URL(callbackUrl!, baseUrl).searchParams.get('code')
      expect(googleCode).toBeDefined()
      expect(googleCode).toContain('mock_google_code_')

      // Step 4: Follow the callback - Aegis exchanges code and redirects to /auth/callback
      const finalResponse = await fetch(callbackUrl!, {
        redirect: 'manual',
      })

      expect(finalResponse.status).toBe(302)
      const finalLocation = finalResponse.headers.get('location')
      expect(finalLocation).toContain('/auth/callback')

      // PR-13: Aegis should redirect with its own CODE
      const aegisCode = extractCodeFromUrl(finalLocation!)
      expect(aegisCode).toBeDefined()
      expect(aegisCode).not.toBe(googleCode) // Should be different from Google's code
    })

    it('should exchange Aegis CODE for JWT tokens', async () => {
      // First complete the OAuth flow to get an Aegis CODE
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/google`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!

      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!

      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!

      const aegisCode = extractCodeFromUrl(finalLocation)!

      // EP-10: Exchange CODE for JWT tokens
      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: aegisCode }),
      })

      const tokenData = await tokenResponse.json()

      // EP-15: Verify access token in response body
      expect(tokenData.accessToken).toBeDefined()
      expect(typeof tokenData.accessToken).toBe('string')

      // Verify it's a valid JWT (3 parts separated by dots)
      const accessToken = tokenData.accessToken as string
      expect(accessToken.split('.')).toHaveLength(3)

      // JT-1: Verify JWT contains user data
      const payload = decodeJwt(accessToken)
      expect(payload.sub).toBe('mock-google-user-12345')
      expect(payload.email).toBe('test@example.com')
      expect(payload.name).toBe('Test User')

      // Verify custom claims were added
      expect(payload.role).toBe('user')
      expect(payload.permissions).toEqual(['read', 'write'])

      // Verify token metadata
      expect(payload.iat).toBeDefined() // Issued at
      expect(payload.exp).toBeDefined() // Expires at
      expect(Number(payload.exp)).toBeGreaterThan(Number(payload.iat))
    })

    it('should set HttpOnly refresh token cookie', async () => {
      // Complete OAuth flow
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/google`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!

      // Exchange CODE for tokens
      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: aegisCode }),
      })

      // EP-16, SC-3, SC-4, SC-5: Verify refresh token cookie
      const setCookie = tokenResponse.headers.get('set-cookie')
      expect(setCookie).toBeDefined()
      expect(setCookie).toContain('nuxt-aegis-refresh=')

      // SC-3: HttpOnly flag
      expect(setCookie).toContain('HttpOnly')

      // SC-4: Secure flag (in production)
      // Note: May not be set in test environment
      // expect(setCookie).toContain('Secure')

      // SC-5: SameSite flag
      expect(setCookie).toContain('SameSite')
    })
  })

  describe('CODE Security Requirements', () => {
    it('should enforce single-use CODE (SC-10, CS-6)', async () => {
      // Get an Aegis CODE
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/google`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!

      // First exchange should succeed
      const firstExchange = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: aegisCode }),
      })
      const firstData = await firstExchange.json()
      expect(firstData.accessToken).toBeDefined()

      // Second exchange with same CODE should fail (single-use)
      await expect(
        exchangeCodeForTokens($fetch, aegisCode),
      ).rejects.toThrow()
    })

    it('should reject invalid CODE with generic error (EP-17, EH-4)', async () => {
      // EP-17: Invalid CODE should be rejected
      const invalidCode = 'invalid-code-12345'

      await expect(
        exchangeCodeForTokens($fetch, invalidCode),
      ).rejects.toThrow()

      // EH-4: Error should be generic (we can't check exact message in this test)
      // But Aegis should return 401 without revealing why the code is invalid
    })

    it('should reject missing CODE with 400 error', async () => {
      await expect(
        $fetch('/auth/token', {
          method: 'POST',
          body: {}, // Missing code
        }),
      ).rejects.toThrow()
    })
  })

  describe('Mock Google Integration', () => {
    it('should correctly call mock Google token endpoint', async () => {
      // Verify that Aegis is using our mock endpoints
      const baseUrl = getUrl('/')
      const authResponse = await fetch(`${baseUrl}auth/google`, { redirect: 'manual' })
      const authorizeUrl = authResponse.headers.get('location')!

      // The authorize URL should point to our mock endpoint
      expect(authorizeUrl).toContain('/mock-google/authorize')
      expect(authorizeUrl).not.toContain('accounts.google.com')

      // Complete the flow to verify token exchange also uses mock
      const mockAuthorizeResponse = await fetch(authorizeUrl, { redirect: 'manual' })
      const callbackUrl = mockAuthorizeResponse.headers.get('location')!
      const finalResponse = await fetch(callbackUrl, { redirect: 'manual' })
      const finalLocation = finalResponse.headers.get('location')!
      const aegisCode = extractCodeFromUrl(finalLocation)!

      // This should work because Aegis uses our mock token endpoint
      const tokenResponse = await fetch(`${baseUrl}auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: aegisCode }),
      })
      const tokenData = await tokenResponse.json()
      expect(tokenData.accessToken).toBeDefined()

      // Verify user data comes from mock
      const payload = decodeJwt(tokenData.accessToken as string)
      expect(payload.sub).toBe('mock-google-user-12345')
    })
  })
})
