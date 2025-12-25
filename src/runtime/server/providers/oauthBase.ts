import { eventHandler, getRequestURL, getQuery, sendRedirect, createError } from 'h3'
import type { H3Event, H3Error } from 'h3'
import type { OAuthConfig, OAuthProviderConfig, NuxtAegisRuntimeConfig } from '../../types'
import type { UserInfoHookPayload, SuccessHookPayload } from '../../types/hooks'
import { defu } from 'defu'
import { useNitroApp, useRuntimeConfig } from '#imports'
import { withQuery } from 'ufo'
import { generateAuthCode, storeAuthCode } from '../utils/authCodeStore'
import { createLogger } from '../utils/logger'
import { useAegisHandler } from '../utils/handler'

const logger = createLogger('OAuth')

// Extract provider keys from the runtime config type
type ProviderKey = 'google' | 'microsoft' | 'github' | 'auth0' | 'mock'

/**
 * Type mapping from provider keys to their configuration types
 */
type ProviderConfigMap = {
  google: import('../../types').GoogleProviderConfig
  microsoft: import('../../types').MicrosoftProviderConfig
  github: import('../../types').GithubProviderConfig
  auth0: import('../../types').Auth0ProviderConfig
  mock: import('../../types').MockProviderConfig
}

/**
 * Protected OAuth parameters that cannot be overridden via authorizationParams
 * These are critical for OAuth security and flow integrity
 */
const PROTECTED_PARAMS = ['client_id', 'redirect_uri', 'code', 'grant_type'] as const

/**
 * Validates and filters custom authorization parameters
 * Removes protected OAuth parameters and logs warnings when they are attempted
 *
 * @param authorizationParams - Custom parameters from configuration
 * @param providerKey - Provider identifier for logging
 * @returns Filtered parameters safe to merge with OAuth query
 */
export function validateAuthorizationParams(
  authorizationParams: Record<string, string> | undefined,
  providerKey: string,
): Record<string, string> {
  if (!authorizationParams) {
    return {}
  }

  const filtered: Record<string, string> = {}
  const protectedFound: string[] = []

  for (const [key, value] of Object.entries(authorizationParams)) {
    if (PROTECTED_PARAMS.includes(key as typeof PROTECTED_PARAMS[number])) {
      protectedFound.push(key)
    }
    else {
      filtered[key] = value
    }
  }

  if (protectedFound.length > 0) {
    logger.warn(`Protected OAuth parameters cannot be overridden in authorizationParams for ${providerKey}:`, {
      attempted: protectedFound,
      protected: PROTECTED_PARAMS,
      message: 'These parameters are ignored for security reasons',
    })
  }

  return filtered
}

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
 * Helper function to create a properly typed OAuth provider implementation
 * Infers the provider key from the runtimeConfigKey property
 */
export function defineOAuthProvider<TKey extends ProviderKey>(
  implementation: OAuthProviderImplementation<TKey>,
): OAuthProviderImplementation<TKey> {
  return implementation
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
 *
 * Handles the complete OAuth 2.0 authorization code flow with CODE-based token delivery:
 *
 * Initial Request (no code parameter):
 * - Redirect user to provider's authorization page
 * - Initiate OAuth flow
 *
 * Callback Request (with code parameter from provider):
 * 1. Exchange authorization code for provider tokens
 * 2. Validate tokens and extract user information
 * 3. Generate cryptographically secure authorization CODE
 * 4. Store CODE with user data (60s expiration, configurable)
 * 5. Redirect to /auth/callback with CODE as query parameter
 *
 * Error Handling:
 * - Generic error redirect to prevent information leakage
 * - Security event logging for all failures
 */
export function defineOAuthEventHandler<
  TKey extends ProviderKey,
  TConfig extends ProviderConfigMap[TKey] = ProviderConfigMap[TKey],
>(
  implementation: OAuthProviderImplementation<TKey>,
  {
    config,
    onError,
    customClaims: _customClaims,
    onUserInfo: _onUserInfo,
    onSuccess: _onSuccess,
  }: OAuthConfig<TConfig>,
) {
  return eventHandler(async (event: H3Event) => {
    try {
      // Merge configuration with runtime config and defaults
      const runtimeConfig = useRuntimeConfig(event).nuxtAegis
      const providerRuntimeConfig = (runtimeConfig.providers?.[implementation.runtimeConfigKey] || {}) as Partial<TConfig>
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

      let providerUserInfo = implementation.extractUser(userResponse)
      const tokens = { access_token, refresh_token, id_token, expires_in }

      // Invoke onUserInfo hooks in priority order:
      // 1. Provider-level onUserInfo (if defined in route handler)
      // 2. Aegis Handler onUserInfo (global transformation)
      if (_onUserInfo) {
        // Provider-level onUserInfo hook takes precedence
        providerUserInfo = await _onUserInfo(providerUserInfo, tokens, event)
      }
      else {
        // Call Aegis Handler as fallback for global transformation
        const handler = useAegisHandler()
        if (handler?.onUserInfo) {
          const hookPayload: UserInfoHookPayload = {
            providerUserInfo,
            tokens,
            provider: implementation.runtimeConfigKey,
            event,
          }
          const transformedUser = await handler.onUserInfo(hookPayload)
          if (transformedUser) {
            providerUserInfo = transformedUser
          }
        }
      }

      // Persist user data and get enriched information
      const handler = useAegisHandler()
      if (handler?.onUserPersist) {
        const enrichedData = await handler.onUserPersist(providerUserInfo, {
          provider: implementation.runtimeConfigKey,
          event,
        })
        // Merge enriched data into provider user info
        providerUserInfo = { ...providerUserInfo, ...enrichedData }
      }

      // Resolve custom claims in priority order:
      // 1. Provider-level customClaims (if defined in route handler)
      // 2. Handler-level customClaims (global, database-driven)
      let resolvedCustomClaims: Record<string, unknown> | undefined
      if (_customClaims) {
        // Provider-level customClaims take precedence
        if (typeof _customClaims === 'function') {
          resolvedCustomClaims = await _customClaims(providerUserInfo, tokens)
        }
        else {
          resolvedCustomClaims = _customClaims
        }
      }
      else if (handler?.customClaims) {
        // Fallback to handler-level customClaims
        resolvedCustomClaims = await handler.customClaims(providerUserInfo)
      }

      // Invoke onSuccess hooks:
      // 1. Provider-level onSuccess (if defined in route handler)
      // 2. Nitro hook 'nuxt-aegis:success' (global hook in server plugin)
      // Both run sequentially if both are defined
      if (_onSuccess) {
        await _onSuccess({
          providerUserInfo,
          tokens,
          provider: implementation.runtimeConfigKey,
          event,
        })
      }

      // Always call Nitro hook for global success handling
      const nitroApp = useNitroApp()
      const successPayload: SuccessHookPayload = {
        providerUserInfo,
        tokens,
        provider: implementation.runtimeConfigKey,
        event,
      }
      await nitroApp.hooks.callHook('nuxt-aegis:success', successPayload)

      // PR-10, PR-11: Generate and store authorization CODE
      try {
        const authCode = generateAuthCode()
        // CS-4, CF-9: Use configured authorization code expiration time
        const authCodeExpiresIn = runtimeConfig.authCode?.expiresIn || 60

        await storeAuthCode(
          authCode,
          providerUserInfo,
          tokens,
          implementation.runtimeConfigKey,
          resolvedCustomClaims,
          authCodeExpiresIn,
          event,
        )

        // Security event logging - OAuth flow completed, redirecting with CODE
        logger.security('OAuth authentication successful, redirecting with CODE', {
          timestamp: new Date().toISOString(),
          event: 'OAUTH_SUCCESS_REDIRECT',
          codePrefix: `${authCode.substring(0, 8)}...`,
        })

        // PR-13: Redirect to client-side callback with authorization CODE
        const callbackUrl = new URL(runtimeConfig.endpoints?.callbackPath || '/auth/callback', getOAuthRedirectUri(event))
        callbackUrl.searchParams.set('code', authCode)

        return sendRedirect(event, callbackUrl.href)
      }
      catch (codeError) {
        // EH-4: Handle CODE generation/storage failure
        logger.error('Authorization code generation/storage failed', {
          timestamp: new Date().toISOString(),
          event: 'CODE_GENERATION_ERROR',
          error: import.meta.dev ? codeError : 'Error details hidden in production',
          severity: 'error',
        })

        // Redirect with generic error - don't reveal CODE generation failure
        const errorUrl = new URL(runtimeConfig.endpoints?.callbackPath || '/auth/callback', getOAuthRedirectUri(event))
        errorUrl.searchParams.set('error', 'authentication_failed')
        return sendRedirect(event, errorUrl.href)
      }
    }
    catch (error) {
      // Security event logging - OAuth authentication failure
      logger.error('OAuth authentication error', {
        timestamp: new Date().toISOString(),
        event: 'OAUTH_AUTH_ERROR',
        error: import.meta.dev ? error : 'Error details hidden in production',
        severity: 'error',
      })

      // PR-14: Handle authentication failure - redirect to callback with error
      if (onError) {
        return await onError(event, error as H3Error)
      }

      // EH-4: Redirect to callback with generic error - don't reveal specific reason
      const runtimeConfig = useRuntimeConfig(event).nuxtAegis as NuxtAegisRuntimeConfig
      const errorUrl = new URL(runtimeConfig.endpoints?.callbackPath || '/auth/callback', getOAuthRedirectUri(event))
      errorUrl.searchParams.set('error', 'authentication_failed')

      return sendRedirect(event, errorUrl.href)
    }
  })
}
