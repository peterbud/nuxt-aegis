import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import type { H3Event, H3Error } from 'h3'
import type { OAuthConfig, OAuthProviderConfig, CustomClaimsCallback } from '../../types'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import { getOAuthRedirectUri, generateAuthToken, setTokenCookie } from '../utils'
import { withQuery } from 'ufo'

// Extract provider keys from the runtime config type
type ProviderKey = 'google' | 'microsoft' | 'github'
// type ProviderKey = keyof Pick<NuxtAegisRuntimeConfig, 'google' | 'microsoft' | 'github'>

/**
 * OAuth provider implementation details
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
 * Base OAuth event handler that provides common OAuth flow functionality
 */
export function defineOAuthEventHandler<
  TConfig extends OAuthProviderConfig,
  TKey extends ProviderKey = ProviderKey,
>(
  implementation: OAuthProviderImplementation<TKey>,
  {
    config,
    onSuccess,
    onError,
    customClaims,
  }: OAuthConfig<TConfig>,
) {
  return eventHandler(async (event: H3Event) => {
    // Merge configuration with runtime config and defaults
    const runtimeConfig = useRuntimeConfig(event)
    const providerRuntimeConfig = runtimeConfig.nuxtAegis?.[implementation.runtimeConfigKey] as Partial<TConfig> || {}
    const mergedConfig = defu(config, providerRuntimeConfig, implementation.defaultConfig) as TConfig

    const query = getQuery<{ code?: string, state?: string }>(event)
    const redirectUri = mergedConfig.redirectUri || getOAuthRedirectUri(event)

    // Step 1: Redirect to authorization server if no code
    if (!query.code) {
      const authQuery = implementation.buildAuthQuery(mergedConfig, redirectUri, query.state)
      return sendRedirect(event, withQuery(implementation.authorizeUrl, authQuery))
    }

    try {
      // Step 2: Exchange authorization code for tokens
      const tokenBody = implementation.buildTokenBody(mergedConfig, query.code, redirectUri)
      const tokenResponse = await $fetch(implementation.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenBody),
      })

      const { access_token, refresh_token, id_token, expires_in } = tokenResponse as {
        access_token: string
        refresh_token?: string
        id_token?: string
        expires_in: number
      }

      // Step 3: Fetch user information
      const userResponse = await $fetch(implementation.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      const user = implementation.extractUser(userResponse)
      const tokens = { refresh_token, id_token, expires_in }

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

      // Step 5: Generate and set authentication token if no custom onSuccess
      if (resolvedCustomClaims && !onSuccess) {
        const authToken = await generateAuthToken(event, user, resolvedCustomClaims)
        const sessionConfig = useRuntimeConfig(event).nuxtAegis?.session
        setTokenCookie(event, authToken, sessionConfig)
        return sendRedirect(event, '/')
      }

      // Step 6: Call custom onSuccess handler
      if (onSuccess) {
        return onSuccess(event, { user, tokens })
      }
      return sendRedirect(event, '/')
    }
    catch (error) {
      if (onError) {
        return onError(event, error as H3Error)
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'OAuth Authentication Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  })
}
