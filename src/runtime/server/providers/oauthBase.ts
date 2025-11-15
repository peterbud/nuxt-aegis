import { eventHandler, getRequestURL, getQuery, sendRedirect, createError } from 'h3'
import type { H3Event, H3Error } from 'h3'
import type { OAuthConfig, OAuthProviderConfig, NuxtAegisRuntimeConfig } from '../../types'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import { withQuery } from 'ufo'
import { generateAuthCode, storeAuthCode } from '../utils/authCodeStore'
import { consola } from 'consola'

// Extract provider keys from the runtime config type
type ProviderKey = 'google' | 'microsoft' | 'github' | 'auth0'

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
    consola.warn(`[Nuxt Aegis] Protected OAuth parameters cannot be overridden in authorizationParams for ${providerKey}:`, {
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
 * - PR-5: Redirect user to provider's authorization page
 * - EP-2: Initiate OAuth flow
 *
 * Callback Request (with code parameter from provider):
 * 1. PR-6, EP-4: Exchange authorization code for provider tokens
 * 2. PR-8, PR-9, EP-5: Validate tokens and extract user information
 * 3. PR-10, PR-11, CS-3: Generate cryptographically secure authorization CODE
 * 4. CS-2, CS-4, CF-9: Store CODE with user data (60s expiration, configurable)
 * 5. PR-13, EP-7: Redirect to /auth/callback with CODE as query parameter
 *
 * Error Handling:
 * - PR-14, EP-8, EH-4: Generic error redirect to prevent information leakage
 * - Security event logging for all failures
 *
 * Requirements: PR-5, PR-6, PR-8, PR-9, PR-10, PR-11, PR-13, PR-14,
 *               EP-2, EP-4, EP-5, EP-7, EP-8, CS-2, CS-3, CS-4, CF-9, EH-4
 */
export function defineOAuthEventHandler<
  TConfig extends OAuthProviderConfig,
  TKey extends ProviderKey = ProviderKey,
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

      let user = implementation.extractUser(userResponse)
      const tokens = { access_token, refresh_token, id_token, expires_in }

      // Invoke onUserInfo hooks: provider-level first, then module-level fallback
      if (_onUserInfo) {
        // Provider-level onUserInfo hook
        user = await _onUserInfo(user, tokens, event)
      }
      else if (runtimeConfig.onUserInfo) {
        // Module-level onUserInfo hook (fallback)
        user = await runtimeConfig.onUserInfo(user, tokens, event)
      }

      // Resolve custom claims if it's a callback function
      let resolvedCustomClaims: Record<string, unknown> | undefined
      if (_customClaims) {
        if (typeof _customClaims === 'function') {
          resolvedCustomClaims = await _customClaims(user, tokens)
        }
        else {
          resolvedCustomClaims = _customClaims
        }
      }

      // Invoke onSuccess hooks: provider-level first, then module-level
      // Both run sequentially (Option B)
      if (_onSuccess) {
        await _onSuccess({
          user,
          tokens,
          provider: implementation.runtimeConfigKey,
          event,
        })
      }
      if (runtimeConfig.onSuccess) {
        await runtimeConfig.onSuccess({
          user,
          tokens,
          provider: implementation.runtimeConfigKey,
          event,
        })
      }

      // PR-10, PR-11: Generate and store authorization CODE
      try {
        const authCode = generateAuthCode()
        // CS-4, CF-9: Use configured authorization code expiration time
        const authCodeExpiresIn = runtimeConfig.authCode?.expiresIn || 60

        await storeAuthCode(authCode, user, tokens, authCodeExpiresIn, resolvedCustomClaims)

        // Security event logging - OAuth flow completed, redirecting with CODE
        consola.debug('[Nuxt Aegis Security] OAuth authentication successful, redirecting with CODE', {
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
        consola.error('[Nuxt Aegis Security] Authorization code generation/storage failed', {
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
      consola.error('[Nuxt Aegis Security] OAuth authentication error', {
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
