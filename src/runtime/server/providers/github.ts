import type { OAuthConfig, GithubProviderConfig } from '../../types'
import { defineOAuthEventHandler, type OAuthProviderImplementation } from './oauthBase'

/**
 * GitHub OAuth provider implementation
 * Implements OAuth 2.0 flow for GitHub authentication
 */
const githubImplementation: OAuthProviderImplementation = {
  runtimeConfigKey: 'github',
  defaultConfig: {
    scopes: ['user:email'],
  },
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',

  extractUser: (userResponse: unknown) => userResponse as { [key: string]: unknown },

  buildAuthQuery: (config: GithubProviderConfig, redirectUri: string, state?: string) => ({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes?.join(' ') || 'user:email',
    state: state || '',
  }),

  buildTokenBody: (config: GithubProviderConfig, code: string, redirectUri: string) => ({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
  }),
}

/**
 * Create a GitHub OAuth event handler
 * @param options - Configuration object
 * @param options.config - GitHub OAuth provider configuration
 * @param options.onError - Error callback function
 * @param options.customClaims - Custom claims to add to JWT
 * @returns Event handler for GitHub OAuth authentication
 */
export function defineOAuthGithubEventHandler({
  config,
  onError,
  customClaims,
}: OAuthConfig<GithubProviderConfig>) {
  return defineOAuthEventHandler(githubImplementation, {
    config,
    onError,
    customClaims,
  })
}
