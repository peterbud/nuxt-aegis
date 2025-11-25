import type { OAuthConfig, GoogleProviderConfig } from '../../types'
import { defineOAuthEventHandler, defineOAuthProvider, validateAuthorizationParams } from './oauthBase'

/**
 * Google OAuth provider implementation
 * Implements OAuth 2.0 flow for Google authentication
 */
const googleImplementation = defineOAuthProvider({
  runtimeConfigKey: 'google' as const,
  defaultConfig: {
    scopes: ['openid', 'profile', 'email'],
  },
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',

  extractUser: (userResponse: unknown) => userResponse as { [key: string]: unknown },

  buildAuthQuery: (config: GoogleProviderConfig, redirectUri: string, state?: string) => {
    // Validate and filter custom authorization parameters
    const customParams = validateAuthorizationParams(config.authorizationParams, 'google')

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

  buildTokenBody: (config: GoogleProviderConfig, code: string, redirectUri: string) => ({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
})

/**
 * Create a Google OAuth event handler
 * @param options - Configuration object
 * @param options.config - Google OAuth provider configuration
 * @param options.onError - Error callback function
 * @param options.customClaims - Custom claims to add to JWT
 * @param options.onUserInfo - User transformation hook
 * @param options.onSuccess - Success callback hook
 * @returns Event handler for Google OAuth authentication
 */
export function defineOAuthGoogleEventHandler({
  config,
  onError,
  customClaims,
  onUserInfo,
  onSuccess,
}: OAuthConfig<GoogleProviderConfig>) {
  return defineOAuthEventHandler(googleImplementation, {
    config,
    onError,
    customClaims,
    onUserInfo,
    onSuccess,
  })
}
