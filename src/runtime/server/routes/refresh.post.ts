import { defineEventHandler, getCookie, createError } from 'h3'
import { generateToken } from '../utils/jwt'
import {
  generateAndStoreRefreshToken,
  hashRefreshToken,
  getRefreshTokenData,
  revokeRefreshToken,
} from '../utils/refreshToken'
import { setRefreshTokenCookie } from '../utils/cookies'
import { useRuntimeConfig } from '#imports'
import type { RefreshResponse, TokenConfig, CookieConfig, TokenPayload, TokenRefreshConfig } from '../../types'

/**
 * POST /auth/refresh
 * EP-27: Refresh endpoint to obtain new access tokens
 * EP-28, EP-28a, EP-28b: Generate new JWT using stored user object (no dependency on old access token)
 * EP-29: Return 401 when refresh token is invalid or expired
 * EP-30: Rotate refresh token and set new cookie
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
    const user = storedRefreshToken.user

    // Get custom claims configuration from the provider
    // Note: Since we don't know which provider was used, we need to get custom claims from somewhere
    // For now, we'll need to store which provider was used or use a global custom claims config
    // TODO: Consider storing provider name in RefreshTokenData for dynamic claim generation

    // Build standard token payload from stored user object
    const payload: TokenPayload = {
      sub: String(user.sub || user.email || user.id || ''),
      email: user.email as string | undefined,
      name: user.name as string | undefined,
      picture: user.picture as string | undefined,
    }

    // Process custom claims using the same logic as initial authentication
    // JT-14, JT-15: Reuse the same custom claims configuration
    // Note: For now, we'll extract custom claims from the old token
    // In a future iteration, we should call the custom claims callback here
    const customClaims: Record<string, unknown> = {}

    // Temporary solution: Extract non-standard claims from stored user object
    // A better solution would be to store custom claims callback reference or re-process them
    const standardFields = ['sub', 'email', 'name', 'picture', 'id', 'login', 'avatar_url', 'given_name', 'family_name', 'locale', 'email_verified']
    Object.entries(user).forEach(([key, value]) => {
      if (!standardFields.includes(key) && value !== undefined && value !== null) {
        customClaims[key] = value
      }
    })

    // EP-28b: Generate new access token with user data and custom claims
    const newToken = await generateToken(payload, tokenConfig, customClaims)

    // EP-30: Generate new refresh token (rotation)
    const newRefreshToken = await generateAndStoreRefreshToken(
      user, // RS-2: Store complete user object
      tokenRefreshConfig,
      hashedRefreshToken, // Pass previous token hash for rotation tracking
      event,
    )

    // Set new refresh token cookie
    setRefreshTokenCookie(event, newRefreshToken, cookieConfig)

    // Revoke the old refresh token
    await revokeRefreshToken(hashedRefreshToken, event)

    return {
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newToken,
    } as RefreshResponse
  }
  catch (error) {
    console.error('[Nuxt Aegis] Token refresh error:', error)

    // EP-21: Return 401 for any refresh errors
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Token refresh failed',
    })
  }
})
