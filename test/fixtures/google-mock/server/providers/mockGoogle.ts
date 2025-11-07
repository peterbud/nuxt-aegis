import { eventHandler, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import type { OAuthConfig, GoogleProviderConfig } from '../../../../../src/runtime/types'
import { defineOAuthEventHandler, type OAuthProviderImplementation } from '../../../../../src/runtime/server/providers/oauthBase'

/**
 * Mock Google OAuth provider implementation
 *
 * This provider extends the real Google provider but points to LOCAL mock endpoints
 * instead of real Google OAuth URLs. This allows testing the complete OAuth flow
 * without external dependencies.
 *
 * Key Differences from Real Google Provider:
 * - authorizeUrl: Points to local /mock-google/authorize instead of accounts.google.com
 * - tokenUrl: Points to local /mock-google/token instead of oauth2.googleapis.com
 * - userInfoUrl: Points to local /mock-google/userinfo instead of googleapis.com
 *
 * Everything Else Is Identical:
 * - Same query parameter building (buildAuthQuery)
 * - Same token request body building (buildTokenBody)
 * - Same user data extraction (extractUser)
 * - Same scopes and configuration
 *
 * This ensures we're testing the REAL Aegis behavior, just with mocked OAuth provider.
 *
 * Note: URLs are set dynamically in the event handler to use the current server URL
 */
const mockGoogleImplementation: OAuthProviderImplementation = {
  runtimeConfigKey: 'google',
  defaultConfig: {
    scopes: ['openid', 'profile', 'email'],
  },
  // These will be overridden dynamically with the actual server URL
  // We use placeholder URLs here that will be replaced
  authorizeUrl: '__MOCK_BASE_URL__/mock-google/authorize',
  tokenUrl: '__MOCK_BASE_URL__/mock-google/token',
  userInfoUrl: '__MOCK_BASE_URL__/mock-google/userinfo',

  // Use the same logic as real Google provider
  extractUser: (userResponse: unknown) => userResponse as { [key: string]: unknown },

  buildAuthQuery: (config: GoogleProviderConfig, redirectUri: string, state?: string) => ({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes?.join(' ') || 'openid profile email',
    state: state || '',
  }),

  buildTokenBody: (config: GoogleProviderConfig, code: string, redirectUri: string) => ({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
}

/**
 * Create a Mock Google OAuth event handler
 *
 * This wraps the OAuth handler to dynamically set the base URL for mock endpoints.
 * The base URL is determined from the current request to ensure mock endpoints
 * are on the same domain as the test server.
 *
 * Usage in tests:
 * ```typescript
 * export default defineMockGoogleEventHandler({
 *   customClaims: {
 *     role: 'user',
 *     permissions: ['read', 'write'],
 *   },
 * })
 * ```
 *
 * @param options - Configuration object
 * @param options.config - Google OAuth provider configuration (optional, uses runtime config)
 * @param options.onError - Error callback function
 * @param options.customClaims - Custom claims to add to JWT
 * @returns Event handler for Mock Google OAuth authentication
 */
export function defineMockGoogleEventHandler({
  config,
  onError,
  customClaims,
}: OAuthConfig<GoogleProviderConfig>) {
  // Create the base OAuth handler
  const oauthHandler = defineOAuthEventHandler(mockGoogleImplementation, {
    config,
    onError,
    customClaims,
  })

  // Wrap it to dynamically set the base URL
  return eventHandler(async (event: H3Event) => {
    // Get the current server URL from the request
    const requestURL = getRequestURL(event)
    const baseUrl = `${requestURL.protocol}//${requestURL.host}`

    // Update the URLs to use the actual base URL
    mockGoogleImplementation.authorizeUrl = `${baseUrl}/mock-google/authorize`
    mockGoogleImplementation.tokenUrl = `${baseUrl}/mock-google/token`
    mockGoogleImplementation.userInfoUrl = `${baseUrl}/mock-google/userinfo`

    // Call the OAuth handler with the updated implementation
    return oauthHandler(event)
  })
}
