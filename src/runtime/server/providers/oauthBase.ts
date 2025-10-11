import { eventHandler, getRequestURL, getQuery, sendRedirect, createError } from 'h3'
import type { H3Event, H3Error } from 'h3'
import type { OAuthConfig, OAuthProviderConfig, CustomClaimsCallback, NuxtAegisRuntimeConfig } from '../../types'
import { defu } from 'defu'
import { useRuntimeConfig, generateAuthTokens, setRefreshTokenCookie } from '#imports'
import { withQuery } from 'ufo'

// Extract provider keys from the runtime config type
type ProviderKey = 'google' | 'microsoft' | 'github' | 'auth0'

/**
 * OAuth provider implementation interface
 * Defines the structure required for OAuth provider implementations
 */
export interface OAuthProviderImplementation<TKey extends ProviderKey = ProviderKey> {
  /** Default configuration for the provider */
  defaultConfig: Partial<OAuthProviderConfig>
  /** Authorization URL for the provider */
  authorizeUrl: string
  /** Token exchange URL for the provider */
  tokenUrl: string
  /** User info URL for the provider */
  userInfoUrl: string
  /** Runtime config key for this provider (e.g., 'google', 'microsoft') */
  runtimeConfigKey: TKey
  /** Extract user info from provider response */
  extractUser: (userResponse: unknown) => { [key: string]: unknown }
  /** Build authorization URL query parameters */
  buildAuthQuery: (config: OAuthProviderConfig, redirectUri: string, state?: string) => Record<string, string>
  /** Build token exchange body parameters */
  buildTokenBody: (config: OAuthProviderConfig, code: string, redirectUri: string) => Record<string, string>
}

/**
 * OAuth token response interface
 */
interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in?: number
  token_type?: string
}

/**
 * Get OAuth redirect URI from the current request
 * @param event - H3Event object
 * @returns Full redirect URI including protocol, host and pathname
 */
function getOAuthRedirectUri(event: H3Event): string {
  const requestURL = getRequestURL(event)
  return `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`
}

/**
 * Base OAuth event handler that provides common OAuth flow functionality
 * Handles the complete OAuth 2.0 authorization code flow
 */
export function defineOAuthEventHandler<
  TConfig extends OAuthProviderConfig,
  TKey extends ProviderKey = ProviderKey,
>(
  implementation: OAuthProviderImplementation<TKey>,
  {
    config,
    onError,
    customClaims,
  }: OAuthConfig<TConfig>,
) {
  return eventHandler(async (event: H3Event) => {
    try {
      // Merge configuration with runtime config and defaults
      const runtimeConfig = useRuntimeConfig(event).nuxtAegis as NuxtAegisRuntimeConfig
      const providerRuntimeConfig = runtimeConfig.providers?.[implementation.runtimeConfigKey] as Partial<TConfig> || {}
      const mergedConfig = defu(config, providerRuntimeConfig, implementation.defaultConfig) as TConfig

      // Validate required configuration
      if (!mergedConfig.clientId || !mergedConfig.clientSecret) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Internal Server Error',
          message: `OAuth provider ${implementation.runtimeConfigKey} is not properly configured`,
        })
      }

      const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

      // Handle OAuth error responses
      if (query.error) {
        throw createError({
          statusCode: 400,
          statusMessage: 'OAuth Error',
          message: `OAuth provider returned error: ${query.error}`,
        })
      }

      const redirectUri = mergedConfig.redirectUri || getOAuthRedirectUri(event)
      // EP-2: Step 1 - Redirect to authorization server if no code
      if (!query.code) {
        const authQuery = implementation.buildAuthQuery(mergedConfig, redirectUri, query.state)
        return sendRedirect(event, withQuery(implementation.authorizeUrl, authQuery))
      }

      // TODO: handle state verification

      // EP-6: Step 2 - Exchange authorization code for tokens
      const tokenBody = implementation.buildTokenBody(mergedConfig, query.code, redirectUri)
      const tokenResponse = await $fetch<OAuthTokenResponse>(implementation.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams(tokenBody),
      })

      const { access_token, refresh_token, id_token, expires_in } = tokenResponse

      if (!access_token) {
        throw createError({
          statusCode: 400,
          statusMessage: 'OAuth Token Error',
          message: 'Failed to obtain access token from provider',
        })
      }

      // Step 3: Fetch user information
      const userResponse = await $fetch(implementation.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      const user = implementation.extractUser(userResponse)
      const tokens = { access_token, refresh_token, id_token, expires_in }

      // Step 4: Handle custom claims
      let resolvedCustomClaims: Record<string, unknown> | undefined

      if (customClaims) {
        if (typeof customClaims === 'function') {
          // Execute callback function
          resolvedCustomClaims = await (customClaims as CustomClaimsCallback)(user, tokens)
        }
        else {
          // Use static object
          resolvedCustomClaims = customClaims
        }
      }

      // EP-7: Step 5 - Generate and set authentication tokens
      const { accessToken, refreshToken } = await generateAuthTokens(event, user, resolvedCustomClaims)
      const cookieConfig = useRuntimeConfig(event).nuxtAegis?.tokenRefresh?.cookie

      // EP-8: Set refresh token as a secure, HttpOnly cookie
      if (refreshToken) {
        setRefreshTokenCookie(event, refreshToken, cookieConfig)
      }

      // EP-9: Redirect to client-side callback with access token in hash
      const redirectUrl = new URL(runtimeConfig.endpoints?.callbackPath || '/auth/callback', getOAuthRedirectUri(event))
      redirectUrl.hash = `access_token=${encodeURIComponent(accessToken)}`

      return sendRedirect(event, redirectUrl.href)
    }
    catch (error) {
      if (import.meta.dev) {
        console.error('[Nuxt Aegis] OAuth authentication error:', error)
      }

      // EP-9: Handle authentication failure
      if (onError) {
        return await onError(event, error as H3Error)
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'OAuth Authentication Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  })
}
