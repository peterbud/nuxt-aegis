import { defineEventHandler, getCookie, createError } from 'h3'
import { generateToken, verifyToken } from '../utils/jwt'
import {
  generateAndStoreRefreshToken,
  hashRefreshToken,
  getRefreshTokenData,
  revokeRefreshToken,
} from '../utils/refreshToken'
import { setRefreshTokenCookie } from '../utils/cookies'
import { processCustomClaims } from '../utils/customClaims'
import { useRuntimeConfig } from '#imports'
import type { RefreshResponse, TokenConfig, CookieConfig, TokenPayload, TokenRefreshConfig } from '../../types'

/**
 * POST /auth/refresh
 * EP-27: Refresh endpoint to obtain new access tokens
 * EP-28, EP-28a, EP-28b: Generate new JWT using stored user object (no dependency on old access token)
 * EP-29: Return 401 when refresh token is invalid or expired
 * EP-30: Rotate refresh token and set new cookie
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

    // EP-28b: Extract user object from stored data
    const providerUserInfo = storedRefreshToken.providerUserInfo
    const provider = storedRefreshToken.provider

    // Get custom claims configuration from runtime config for this provider
    // JT-14, JT-15: Reuse the same custom claims configuration by invoking the callback
    let customClaims: Record<string, unknown> = {}

    // Access provider-specific configuration from runtime config
    const providerConfig = config.nuxtAegis?.providers?.[provider as 'google' | 'github' | 'microsoft' | 'auth0']

    if (providerConfig && 'customClaims' in providerConfig) {
      const customClaimsConfig = providerConfig.customClaims

      if (customClaimsConfig) {
        // Process custom claims using the same processCustomClaims utility
        // This ensures the same callback is invoked for both initial auth and refresh
        customClaims = await processCustomClaims(providerUserInfo, customClaimsConfig)
      }
    }

    // Build standard token payload from stored user object
    const payload: TokenPayload = {
      sub: String(providerUserInfo.sub || providerUserInfo.email || providerUserInfo.id || ''),
      email: providerUserInfo.email as string | undefined,
      name: providerUserInfo.name as string | undefined,
      picture: providerUserInfo.picture as string | undefined,
    }

    // EP-28b: Generate new access token with user data and custom claims
    const newToken = await generateToken(payload, tokenConfig, customClaims)

    // EP-30: Generate new refresh token (rotation)
    const newRefreshToken = await generateAndStoreRefreshToken(
      providerUserInfo, // RS-2: Store complete OAuth provider user data
      provider, // Store provider name
      tokenRefreshConfig,
      hashedRefreshToken, // Pass previous token hash for rotation tracking
      event,
    )

    // Set new refresh token cookie
    if (newRefreshToken) {
      setRefreshTokenCookie(event, newRefreshToken, cookieConfig)
    }

    // Revoke the old refresh token
    await revokeRefreshToken(hashedRefreshToken, event)

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
