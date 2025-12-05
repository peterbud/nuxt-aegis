import { eventHandler, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import type { OAuthConfig, MockProviderConfig, OAuthProviderConfig } from '../../types'
import { defineOAuthEventHandler, defineOAuthProvider, type OAuthProviderImplementation, validateAuthorizationParams } from './oauthBase'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../utils/logger'

const logger = createLogger('MockProvider')

// Track if we've already logged the mock provider warning
let hasLoggedWarning = false

/**
 * Mock OAuth Provider Implementation
 *
 * DEVELOPMENT/TEST ONLY - Provides a complete OAuth flow without external dependencies.
 *
 * This provider simulates an OAuth 2.0 provider locally, enabling:
 * - Testing OAuth flows without real provider credentials
 * - Multiple user personas for different test scenarios
 * - Error simulation for testing error handling
 * - Deterministic behavior for reliable tests
 *
 * Key Features:
 * - Dynamic URL resolution (points to local /auth/mock/* endpoints)
 * - User persona selection via ?user= query parameter
 * - OAuth error simulation via ?mock_error= query parameter
 * - Generates valid JWTs with 'nuxt-aegis-mock' issuer
 * - Single-use authorization codes with 60s expiration
 *
 * Security:
 * - Blocked in production by default (requires enableInProduction: true)
 * - Logs prominent warnings when active
 * - Never use in production environments
 */

/**
 * Check if mock provider is allowed to run
 * Throws error in production unless explicitly enabled or in test environment
 */
function checkMockProviderAllowed(config: MockProviderConfig): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

  // Allow in test environment without enableInProduction flag
  if (isTest) {
    return
  }

  // PR-3.5: Block in production unless explicitly enabled
  if (isProduction && !config.enableInProduction) {
    throw new Error(
      '[nuxt-aegis] Mock provider is not available in production. '
      + 'This is a security feature. Never use mock authentication in production. '
      + 'If you absolutely must enable it (NOT RECOMMENDED), set enableInProduction: true in your mock provider config.',
    )
  }

  // PR-3.6: Log prominent warning when enabled in production
  if (isProduction && config.enableInProduction) {
    if (!hasLoggedWarning) {
      logger.error(
        '⚠️  Mock provider is enabled in PRODUCTION mode. '
        + 'This is extremely dangerous and should never be done in a real production environment!',
      )
      hasLoggedWarning = true
    }
  }

  // PR-3.6: Log warning in non-production environments
  // Only log warning at runtime (first actual request), not during imports/build
  if (!isProduction && !hasLoggedWarning) {
    logger.warn(
      '⚠️  Mock authentication provider is active. '
      + 'This is for development/testing only and should never be used in production.',
    )
    hasLoggedWarning = true
  }
}

/**
 * Validate mock provider configuration
 * Ensures required fields are present and valid
 */
function validateMockConfig(config: Partial<MockProviderConfig>): void {
  // PR-3.8: Require at least one mock user persona
  if (!config.mockUsers || Object.keys(config.mockUsers).length === 0) {
    throw new Error(
      '[nuxt-aegis] Mock provider requires mockUsers configuration. '
      + 'Define at least one user persona in your nuxt.config.ts:\n\n'
      + 'nuxtAegis: {\n'
      + '  providers: {\n'
      + '    mock: {\n'
      + '      clientId: "mock-client",\n'
      + '      clientSecret: "mock-secret",\n'
      + '      mockUsers: {\n'
      + '        user: {\n'
      + '          sub: "mock-user-001",\n'
      + '          email: "user@example.com",\n'
      + '          name: "Test User"\n'
      + '        }\n'
      + '      }\n'
      + '    }\n'
      + '  }\n'
      + '}',
    )
  }

  // PR-3.8: Validate each mock user has required fields (sub, email, name)
  for (const [userId, userData] of Object.entries(config.mockUsers)) {
    if (!userData.sub) {
      throw new Error(`[nuxt-aegis] Mock user '${userId}' is missing required field: sub`)
    }
    if (!userData.email) {
      throw new Error(`[nuxt-aegis] Mock user '${userId}' is missing required field: email`)
    }
    if (!userData.name) {
      throw new Error(`[nuxt-aegis] Mock user '${userId}' is missing required field: name`)
    }
  }

  // Validate defaultUser if specified
  if (config.defaultUser && !config.mockUsers[config.defaultUser]) {
    throw new Error(
      `[nuxt-aegis] Mock provider defaultUser '${config.defaultUser}' does not exist in mockUsers. `
      + `Available users: ${Object.keys(config.mockUsers).join(', ')}`,
    )
  }
}

/**
 * Mock OAuth provider implementation
 * Uses dynamic URLs that point to local mock endpoints
 */
const mockImplementation: OAuthProviderImplementation = defineOAuthProvider({
  runtimeConfigKey: 'mock',
  defaultConfig: {
    scopes: ['openid', 'profile', 'email'],
  },
  // These will be overridden dynamically with the actual server URL
  authorizeUrl: '__MOCK_BASE_URL__/auth/mock/authorize',
  tokenUrl: '__MOCK_BASE_URL__/auth/mock/token',
  userInfoUrl: '__MOCK_BASE_URL__/auth/mock/userinfo',

  extractUser: (userResponse: unknown) => userResponse as { [key: string]: unknown },

  buildAuthQuery: (config: OAuthProviderConfig, redirectUri: string, state?: string) => {
    // Validate and filter custom authorization parameters
    const customParams = validateAuthorizationParams(config.authorizationParams, 'mock')

    return {
      // Custom parameters first (can be overridden by defaults)
      ...customParams,
      // Default OAuth parameters (take precedence)
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scopes?.join(' ') || 'openid profile email',
      state: state || '',
    }
  },

  buildTokenBody: (config: OAuthProviderConfig, code: string, redirectUri: string) => ({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
})

/**
 * Create a Mock OAuth event handler
 *
 * Wraps the OAuth handler to:
 * 1. Check if mock provider is allowed (blocks production)
 * 2. Validate configuration
 * 3. Dynamically set base URL for mock endpoints
 * 4. Pass through user selection and error simulation parameters
 *
 * Usage:
 * ```typescript
 * // server/routes/auth/mock.get.ts
 * export default defineOAuthMockEventHandler({
 *   customClaims: {
 *     role: 'user',
 *     permissions: ['read', 'write'],
 *   },
 * })
 * ```
 *
 * User Selection:
 * - Navigate to /auth/mock to use default user
 * - Navigate to /auth/mock?user=admin to use specific persona
 *
 * Error Simulation:
 * - Navigate to /auth/mock?mock_error=access_denied to test error handling
 *
 * @param options - Configuration object
 * @param options.config - Mock provider configuration (optional, uses runtime config)
 * @param options.onError - Error callback function
 * @param options.customClaims - Custom claims to add to JWT
 * @param options.onUserInfo - User transformation hook
 * @param options.onSuccess - Success callback hook
 * @returns Event handler for Mock OAuth authentication
 */
export function defineOAuthMockEventHandler({
  config,
  onError,
  customClaims,
  onUserInfo,
  onSuccess,
}: OAuthConfig<MockProviderConfig>) {
  // Wrap it to add mock-specific logic
  return eventHandler(async (event: H3Event) => {
    // Get the current server URL from the request
    const requestURL = getRequestURL(event)
    const baseUrl = `${requestURL.protocol}//${requestURL.host}`

    // Extract user and mock_error parameters from the incoming request
    const { getQuery } = await import('h3')
    const incomingQuery = getQuery(event)
    const userParam = incomingQuery.user as string | undefined
    const mockErrorParam = incomingQuery.mock_error as string | undefined

    // Update the URLs to use the actual base URL
    mockImplementation.authorizeUrl = `${baseUrl}/auth/mock/authorize`
    mockImplementation.tokenUrl = `${baseUrl}/auth/mock/token`
    mockImplementation.userInfoUrl = `${baseUrl}/auth/mock/userinfo`

    // Get runtime config to check production mode and validate config
    const runtimeConfig = useRuntimeConfig(event)
    const mockConfig = runtimeConfig.nuxtAegis?.providers?.mock

    if (mockConfig) {
      // PR-3.5, PR-3.6: Check if mock provider is allowed (production blocking)
      checkMockProviderAllowed(mockConfig)

      // PR-3.8: Validate configuration (required fields)
      validateMockConfig(mockConfig)
    }

    // PR-3.2, PR-3.3: Merge the incoming user/error parameters into authorizationParams
    // This ensures they're passed to the authorization endpoint
    const enhancedConfig = config || mockConfig
    if (enhancedConfig && (userParam || mockErrorParam)) {
      const additionalParams: Record<string, string> = {}
      if (userParam) additionalParams.user = userParam // PR-3.2: User persona selection
      if (mockErrorParam) additionalParams.mock_error = mockErrorParam // PR-3.3: Error simulation

      enhancedConfig.authorizationParams = {
        ...enhancedConfig.authorizationParams,
        ...additionalParams,
      }
    }

    // PR-3.7: Create the OAuth handler with enhanced config
    // Uses same authentication flow as real providers
    const oauthHandler = defineOAuthEventHandler(mockImplementation, {
      config: enhancedConfig,
      onError,
      customClaims,
      onUserInfo,
      onSuccess,
    })

    // Call the OAuth handler with the updated implementation
    return oauthHandler(event)
  })
}
