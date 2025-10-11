import type { OAuthConfig, GoogleProviderConfig } from '../../types'
import { defineOAuthEventHandler, type OAuthProviderImplementation } from './oauthBase'

/**
 * Google OAuth provider implementation
 * Implements OAuth 2.0 flow for Google authentication
 */
const googleImplementation: OAuthProviderImplementation = {
  runtimeConfigKey: 'google',
  defaultConfig: {
    scopes: ['openid', 'profile', 'email'],
  },
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',

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
 * Create a Google OAuth event handler
 * @param options - Configuration object
 * @param options.config - Google OAuth provider configuration
 * @param options.onError - Error callback function
 * @param options.customClaims - Custom claims to add to JWT
 * @returns Event handler for Google OAuth authentication
 */
export function defineOAuthGoogleEventHandler({
  config,
  onError,
  customClaims,
}: OAuthConfig<GoogleProviderConfig>) {
  return defineOAuthEventHandler(googleImplementation, {
    config,
    onError,
    customClaims,
  })
}
