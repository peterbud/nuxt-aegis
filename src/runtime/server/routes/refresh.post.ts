import { defineEventHandler, getCookie, createError } from 'h3'
import { generateToken, verifyToken } from '../utils/jwt'
import {
  generateAndStoreRefreshToken,
  hashRefreshToken,
  getRefreshTokenData,
  revokeRefreshToken,
} from '../utils/refreshToken'
import { setRefreshTokenCookie } from '../utils/cookies'
import { useRuntimeConfig } from '#imports'
import type { RefreshResponse, TokenConfig, CookieConfig, BaseTokenClaims, TokenRefreshConfig } from '../../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('Refresh')

/**
 * POST /auth/refresh
 * Refresh endpoint to obtain new access tokens
 * Rejects refresh requests for impersonated sessions
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cookieConfig = config.nuxtAegis?.tokenRefresh?.cookie as CookieConfig
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  if (!tokenConfig || !tokenConfig.secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Token configuration is missing',
    })
  }

  // Get refresh token from cookie
  const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'
  const refreshToken = getCookie(event, cookieName)

  if (!refreshToken) {
    // EP-29: Return 401 when no token provided
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'No refresh token found',
    })
  }

  try {
    // Check if current session is impersonated (from Authorization header if present)
    // Impersonated sessions cannot be refreshed - user must call unimpersonate
    const authHeader = event.node.req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const currentToken = await verifyToken(token, tokenConfig.secret, false) // Don't check expiration

      if (currentToken?.impersonation) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: 'Cannot refresh impersonated session. Please call unimpersonate to restore your original session.',
        })
      }
    }

    // Hash the refresh token
    const hashedRefreshToken = hashRefreshToken(refreshToken)

    // EP-28: Retrieve stored user object and metadata from persistent storage
    const storedRefreshToken = await getRefreshTokenData(hashedRefreshToken, event)

    // Validate token exists, not revoked, and not expired
    const isRevoked = storedRefreshToken?.isRevoked || false
    const isExpired = storedRefreshToken?.expiresAt ? (Date.now() > storedRefreshToken.expiresAt) : true

    if (!storedRefreshToken || isRevoked || isExpired) {
      // EP-29: Return 401 when token is invalid, revoked, or expired
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      })
    }

    // EP-28b: Extract user object and custom claims from stored data
    const providerUserInfo = storedRefreshToken.providerUserInfo
    const provider = storedRefreshToken.provider

    // JT-14, JT-15: Use stored custom claims from initial authentication
    // This ensures custom claims are consistent between initial auth and refresh
    // and works for both runtime config and route handler custom claims
    const customClaims: Record<string, unknown> = storedRefreshToken.customClaims || {}

    // Build standard token payload from stored user object
    const payload: BaseTokenClaims = {
      sub: String(providerUserInfo.sub || providerUserInfo.email || providerUserInfo.id || ''),
      email: providerUserInfo.email as string | undefined,
      name: providerUserInfo.name as string | undefined,
      picture: providerUserInfo.picture as string | undefined,
      provider, // Include provider name in JWT payload
    }

    // EP-28b: Generate new access token with user data and custom claims
    const newToken = await generateToken(payload, tokenConfig, customClaims)

    // EP-30: Conditionally rotate refresh token based on configuration
    const rotationEnabled = tokenRefreshConfig?.rotationEnabled ?? true // Default true for backward compatibility

    if (rotationEnabled) {
      // Generate new refresh token (rotation)
      logger.debug('Rotating refresh token for user:', payload.sub)
      const newRefreshToken = await generateAndStoreRefreshToken(
        providerUserInfo, // RS-2: Store complete OAuth provider user data
        provider, // Store provider name
        tokenRefreshConfig,
        hashedRefreshToken, // Pass previous token hash for rotation tracking
        customClaims, // Preserve custom claims in new refresh token
        event,
      )

      // Set new refresh token cookie
      if (newRefreshToken) {
        setRefreshTokenCookie(event, newRefreshToken, cookieConfig)
      }

      // Revoke the old refresh token
      await revokeRefreshToken(hashedRefreshToken, event)
    }
    else {
      // Reuse existing refresh token - re-set cookie to ensure it doesn't expire in browser
      logger.debug('Reusing existing refresh token for user:', payload.sub)
      setRefreshTokenCookie(event, refreshToken, cookieConfig)
    }

    return {
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newToken,
    } as RefreshResponse
  }
  catch {
    // EP-21: Return 401 for any refresh errors
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Token refresh failed',
    })
  }
})
