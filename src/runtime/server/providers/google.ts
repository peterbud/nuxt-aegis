import type { OAuthConfig, GoogleProviderConfig } from '../../types'
import { defineOAuthEventHandler, type OAuthProviderImplementation } from './oauthBase'

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
    scope: config.scopes?.join(' ') || '',
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

export function defineOAuthGoogleEventHandler({
  config,
  onSuccess,
  onError,
  customClaims,
}: OAuthConfig<GoogleProviderConfig>) {
  return defineOAuthEventHandler(googleImplementation, {
    config,
    onSuccess,
    onError,
    customClaims,
  })
}
