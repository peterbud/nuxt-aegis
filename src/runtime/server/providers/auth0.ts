import type { OAuthConfig, Auth0ProviderConfig } from '../../types'
import { defineOAuthEventHandler, type OAuthProviderImplementation, validateAuthorizationParams } from './oauthBase'

/**
 * Get Auth0 domain URL, ensuring it has the https:// prefix
 */
function getAuth0DomainUrl(domain: string): string {
  return domain.startsWith('https://') ? domain : `https://${domain}`
}

/**
 * Auth0 OAuth provider implementation
 * Implements OAuth 2.0 flow for Auth0 authentication
 */
const auth0Implementation: OAuthProviderImplementation = {
  runtimeConfigKey: 'auth0',
  defaultConfig: {
    scopes: ['openid', 'profile', 'email'],
  },
  // These will be dynamically set based on the domain in buildAuthQuery
  authorizeUrl: '',
  tokenUrl: '',
  userInfoUrl: '',

  extractUser: (userResponse: unknown) => userResponse as { [key: string]: unknown },

  buildAuthQuery: (config: Auth0ProviderConfig, redirectUri: string, state?: string) => {
    if (!config.domain) {
      throw new Error('Auth0 domain is required in configuration')
    }

    // Set the URLs dynamically based on the domain from merged config
    const domainUrl = getAuth0DomainUrl(config.domain)
    auth0Implementation.authorizeUrl = config.authorizeUrl || `${domainUrl}/authorize`
    auth0Implementation.tokenUrl = config.tokenUrl || `${domainUrl}/oauth/token`
    auth0Implementation.userInfoUrl = config.userInfoUrl || `${domainUrl}/userinfo`

    // Validate and filter custom authorization parameters
    const customParams = validateAuthorizationParams(config.authorizationParams, 'auth0')

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

  buildTokenBody: (config: Auth0ProviderConfig, code: string, redirectUri: string) => ({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
}

/**
 * Create an Auth0 OAuth event handler
 * @param options - Configuration object
 * @param options.config - Auth0 OAuth provider configuration
 * @param options.onError - Error callback function
 * @param options.customClaims - Custom claims to add to JWT
 * @param options.onUserInfo - User transformation hook
 * @param options.onSuccess - Success callback hook
 * @returns Event handler for Auth0 OAuth authentication
 */
export function defineOAuthAuth0EventHandler({
  config = {} as Auth0ProviderConfig,
  onError,
  customClaims,
  onUserInfo,
  onSuccess,
}: OAuthConfig<Auth0ProviderConfig>) {
  return defineOAuthEventHandler(auth0Implementation, {
    config,
    onError,
    customClaims,
    onUserInfo,
    onSuccess,
  })
}
