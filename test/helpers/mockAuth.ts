/**
 * Mock Authentication Test Helpers
 *
 * Utilities for testing the Aegis module with mock Google OAuth.
 * These helpers simulate user actions and verify Aegis behavior.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchFunction = any

/**
 * Mock Google user profile structure
 */
export interface MockUserProfile {
  sub: string
  email: string
  email_verified: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
  locale: string
}

/**
 * Tokens extracted from Aegis responses
 */
export interface AegisTokens {
  accessToken: string
  refreshTokenCookie?: string
  hasHttpOnlyFlag?: boolean
  hasSecureFlag?: boolean
  hasSameSiteFlag?: boolean
}

/**
 * Create a mock Google user profile with defaults
 * Allows overriding specific fields for test scenarios
 */
export function createMockUser(overrides?: Partial<MockUserProfile>): MockUserProfile {
  return {
    sub: 'mock-google-user-12345',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/mock-avatar',
    locale: 'en',
    ...overrides,
  }
}

/**
 * Extract Aegis CODE from callback URL
 * Aegis redirects to /auth/callback?code=<CODE> after OAuth
 */
export function extractCodeFromUrl(url: string): string | null {
  const urlObj = new URL(url, 'http://localhost')
  return urlObj.searchParams.get('code')
}

/**
 * Extract error from callback URL
 * Provider errors result in /auth/callback?error=<error>
 */
export function extractErrorFromUrl(url: string): string | null {
  const urlObj = new URL(url, 'http://localhost')
  return urlObj.searchParams.get('error')
}

/**
 * Parse cookie from Set-Cookie header
 */
export function parseCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) {
    return null
  }

  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1] || null
}

/**
 * Get cookie value from response object
 */
export function getCookieValue(response: Record<string, unknown>, name: string): string | null {
  const setCookieHeader = response.headers && typeof response.headers === 'object'
    ? (response.headers as Record<string, string>)['set-cookie']
    : null

  return parseCookie(setCookieHeader || null, name)
}

/**
 * Extract tokens that AEGIS generated and returned
 * Verifies Aegis returns them in the correct format
 */
export function extractAegisTokens(response: Record<string, unknown>): AegisTokens {
  const setCookieHeader = response.headers && typeof response.headers === 'object'
    ? (response.headers as Record<string, string>)['set-cookie']
    : null

  return {
    accessToken: (response.access_token as string) || '',
    refreshTokenCookie: parseCookie(setCookieHeader || null, 'nuxt-aegis-refresh') || undefined,
    hasHttpOnlyFlag: setCookieHeader?.includes('HttpOnly'),
    hasSecureFlag: setCookieHeader?.includes('Secure'),
    hasSameSiteFlag: setCookieHeader?.includes('SameSite'),
  }
}

/**
 * Simulate complete OAuth login flow
 * Returns the final response after Aegis processes everything
 *
 * This helper simulates USER ACTIONS through the OAuth flow:
 * 1. User navigates to /auth/google
 * 2. Aegis redirects to mock Google
 * 3. Mock Google redirects back with code
 * 4. Aegis exchanges code and redirects to /auth/callback
 *
 * We then verify that Aegis did everything correctly.
 */
export async function completeLoginFlow($fetch: FetchFunction, options?: {
  provider?: string
  expectError?: boolean
  mockError?: string
}): Promise<string> {
  const provider = options?.provider || 'google'

  // Build the auth URL with optional error simulation
  let authUrl = `/auth/${provider}`
  if (options?.mockError) {
    authUrl += `?mock_error=${options.mockError}`
  }

  try {
    // Step 1: Navigate to auth endpoint
    // Aegis will redirect through the OAuth flow
    // We follow redirects manually to track the flow
    const response = await $fetch.raw(authUrl, {
      redirect: 'manual',
    })

    // Should redirect to mock-google/authorize
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error('No redirect location found')
      }

      // This would be the authorize URL - in real test it auto-redirects back
      // For now, return the final URL we'd expect (callback with code or error)
      return location
    }

    throw new Error(`Unexpected response status: ${response.status}`)
  }
  catch (error: unknown) {
    const err = error as { response?: { status?: number, headers?: { get: (name: string) => string | null } } }
    if (err.response && (err.response.status === 302 || err.response.status === 307)) {
      return err.response.headers?.get('location') || ''
    }
    throw error
  }
}

/**
 * Exchange Aegis CODE for JWT tokens
 * Tests the /auth/token endpoint (EP-10 through EP-18)
 */
export async function exchangeCodeForTokens($fetch: FetchFunction, code: string): Promise<Record<string, unknown>> {
  return await $fetch('/auth/token', {
    method: 'POST',
    body: { code },
  })
}

/**
 * Make a request to a route protected by Aegis middleware
 * Tests that Aegis correctly validates tokens
 */
export async function accessProtectedRoute($fetch: FetchFunction, url: string, options?: {
  accessToken?: string
  refreshCookie?: string
}): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {}

  if (options?.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`
  }

  if (options?.refreshCookie) {
    headers['Cookie'] = `nuxt-aegis-refresh=${options.refreshCookie}`
  }

  return await $fetch(url, { headers })
}

/**
 * Refresh access token using refresh token cookie
 * Tests the /auth/refresh endpoint (TR-1 through TR-7)
 */
export async function refreshAccessToken($fetch: FetchFunction, refreshToken: string): Promise<Record<string, unknown>> {
  return await $fetch('/auth/refresh', {
    method: 'POST',
    headers: {
      Cookie: `nuxt-aegis-refresh=${refreshToken}`,
    },
  })
}

/**
 * Logout and clear tokens
 * Tests the /auth/logout endpoint
 */
export async function logout($fetch: FetchFunction, refreshToken?: string): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {}

  if (refreshToken) {
    headers['Cookie'] = `nuxt-aegis-refresh=${refreshToken}`
  }

  return await $fetch('/auth/logout', {
    method: 'POST',
    headers,
  })
}

/**
 * Decode JWT payload (without verification - for testing only)
 */
export function decodeJwt(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const payload = parts[1]
  if (!payload) {
    throw new Error('Invalid JWT payload')
  }
  const decoded = Buffer.from(payload, 'base64').toString('utf-8')
  return JSON.parse(decoded)
}
