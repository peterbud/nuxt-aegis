import {
  defineEventHandler,
  getRequestURL,
  getQuery,
  parseCookies,
  getRequestHeader,
  setCookie,
  deleteCookie,
  sendRedirect,
  createError,
  isNuxtError,
  useServerHooks,
  useRuntimeConfig,
} from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import type { OAuthConfig, OAuthProviderConfig } from '../../types'
import type { UserInfoHookPayload, SuccessHookPayload } from '../../types/hooks'
import { defu } from 'defu'
import { withQuery } from 'ufo'
import { generateAuthCode, storeAuthCode } from '../utils/authCodeStore'
import { createLogger } from '../utils/logger'
import { useAegisHandler } from '../utils/handler'
import {
  hasOAuthControlCharacters,
  isOAuthGeneratedValue,
  oauthTransactions,
  OAUTH_BROWSER_LIMIT,
  OAUTH_TRANSACTION_TTL,
  validateOAuthRedirect,
} from '../utils/oauthTransaction'

const logger = createLogger('OAuth')
const PROOF_COOKIE_PREFIX = 'nuxt-aegis-oauth-'

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
const PROTECTED_PARAMS = ['client_id', 'redirect_uri', 'code', 'grant_type', 'state'] as const

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
 * @param event - RequestEvent object
 * @returns Full redirect URI including protocol, host and pathname
 */
function getOAuthRedirectUri(event: RequestEvent): string {
  const requestURL = getRequestURL(event, { xForwardedProto: useRuntimeConfig().nuxtAegis?.oauthTransaction?.trustProxy === true })
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
  return defineEventHandler(async (event) => {
    try {
      // Merge configuration with runtime config and defaults
      const runtimeConfig = (useRuntimeConfig().nuxtAegis) || {}
      const providerRuntimeConfig = (runtimeConfig.providers?.[implementation.runtimeConfigKey] || {}) as Partial<TConfig>
      const mergedConfig = defu(config, providerRuntimeConfig, implementation.defaultConfig) as TConfig

      // Validate required configuration
      if (!mergedConfig.clientId || !mergedConfig.clientSecret) {
        throw createError({
          status: 500,
          statusText: 'Internal Server Error',
          message: `OAuth provider ${implementation.runtimeConfigKey} is not properly configured`,
        })
      }

      const query = getQuery<{ code?: string, state?: string, error?: string, redirectTo?: string }>(event)
      const requestURL = getRequestURL(event, { xForwardedProto: runtimeConfig.oauthTransaction?.trustProxy === true })
      const callback = requestURL.searchParams.has('code') || requestURL.searchParams.has('error')
      const invalidRequest = () => createError({ status: 400, message: 'OAuth authentication failed' })
      for (const key of ['code', 'state', 'error', ...(callback ? [] : ['redirectTo'])]) {
        const values = requestURL.searchParams.getAll(key)
        if (values.length > 1 || (values.length === 1 && (!values[0]?.trim() || hasOAuthControlCharacters(values[0])))) {
          throw invalidRequest()
        }
      }
      if (runtimeConfig.oauthTransaction?.driver && runtimeConfig.oauthTransaction.driver !== 'memory') {
        throw createError({ status: 503, message: 'OAuth login unavailable' })
      }
      const redirectUri = mergedConfig.redirectUri || getOAuthRedirectUri(event)
      const context = { provider: implementation.runtimeConfigKey, clientId: mergedConfig.clientId, redirectUri }
      const secure = requestURL.protocol === 'https:'
      const cookiePrefix = `${secure ? '__Host-' : ''}${PROOF_COOKIE_PREFIX}`
      const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure }
      const cookies = parseCookies(event)
      if (!callback) {
        let pending = 0
        for (const name of Object.keys(cookies)) {
          const match = /^(?:__Host-)?nuxt-aegis-oauth-[\w-]{43}\.(\d+)$/.exec(name)
          if (!match) continue
          if (Number(match[1]) <= Date.now()) {
            deleteCookie(event, name, { ...cookieOptions, secure: name.startsWith('__Host-') })
          }
          else pending++
        }
        if (pending >= OAUTH_BROWSER_LIMIT) throw createError({ status: 429, message: 'OAuth login unavailable' })
        if (query.redirectTo !== undefined) {
          try {
            validateOAuthRedirect(query.redirectTo)
          }
          catch {
            throw invalidRequest()
          }
        }
        let transaction: ReturnType<typeof oauthTransactions.create>
        try {
          transaction = oauthTransactions.create(context, {
            redirectTo: query.redirectTo,
            applicationState: query.state,
          }, runtimeConfig.oauthTransaction?.capacity ?? 10_000)
        }
        catch {
          throw createError({ status: 503, message: 'OAuth login unavailable' })
        }
        const authQuery = implementation.buildAuthQuery(mergedConfig, redirectUri, transaction.state)
        authQuery.state = transaction.state
        setCookie(event, `${cookiePrefix}${transaction.state}.${transaction.expiresAt}`, transaction.proof, {
          ...cookieOptions,
          expires: new Date(transaction.expiresAt),
          maxAge: OAUTH_TRANSACTION_TTL / 1000,
        })
        return sendRedirect(event, withQuery(implementation.authorizeUrl, authQuery))
      }

      if (!isOAuthGeneratedValue(query.state) || (query.code && query.error)) throw invalidRequest()
      const names = Object.keys(cookies).filter(name => name.startsWith(`${cookiePrefix}${query.state}.`))
      if (names.length !== 1) throw invalidRequest()
      const cookieName = names[0]!
      const occurrences = (getRequestHeader(event, 'cookie') || '').split(';').filter(part => part.trim().startsWith(`${cookieName}=`))
      if (occurrences.length !== 1) throw invalidRequest()
      let transaction: ReturnType<typeof oauthTransactions.consume>
      try {
        transaction = oauthTransactions.consume(query.state, cookies[cookieName]!, context)
      }
      catch {
        throw createError({ status: 503, message: 'OAuth login unavailable' })
      }
      if (!transaction) throw invalidRequest()
      deleteCookie(event, cookieName, cookieOptions)
      if (query.error) throw invalidRequest()
      if (!query.code) throw invalidRequest()
      const redirectTo = transaction.redirectTo === undefined ? undefined : validateOAuthRedirect(transaction.redirectTo)

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
          status: 400,
          statusText: 'OAuth Token Error',
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
      // 2. Server hook 'nuxt-aegis:success' (global hook in server plugin)
      // Both run sequentially if both are defined
      if (_onSuccess) {
        await _onSuccess({
          providerUserInfo,
          tokens,
          provider: implementation.runtimeConfigKey,
          event,
        })
      }

      // Always call server hook for global success handling
      const successPayload: SuccessHookPayload = {
        providerUserInfo,
        tokens,
        provider: implementation.runtimeConfigKey,
        event,
      }
      await useServerHooks().callHook('nuxt-aegis:success', successPayload)

      // PR-10, PR-11: Generate and store authorization CODE
      try {
        const authCode = generateAuthCode()
        // CS-4, CF-9: Use configured authorization code expiration time
        const authCodeExpiresIn = runtimeConfig.authCode?.expiresIn || 60

        await storeAuthCode(
          authCode,
          providerUserInfo,
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

        if (redirectTo) {
          callbackUrl.searchParams.set('redirectTo', redirectTo)
        }

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
        const callbackError = isNuxtError(error)
          ? error
          : createError({
              status: 500,
              message: error instanceof Error
                ? error.message
                : 'OAuth authentication failed',
              cause: error,
            })
        if (!isNuxtError(callbackError)) {
          throw callbackError
        }
        return await onError(event, callbackError)
      }

      // EH-4: Redirect to callback with generic error - don't reveal specific reason
      const runtimeConfig = useRuntimeConfig().nuxtAegis || {}
      const errorUrl = new URL(runtimeConfig.endpoints?.callbackPath || '/auth/callback', getOAuthRedirectUri(event))
      errorUrl.searchParams.set('error', 'authentication_failed')

      return sendRedirect(event, errorUrl.href)
    }
  })
}
