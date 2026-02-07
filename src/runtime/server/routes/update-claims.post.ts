import { defineEventHandler, getCookie, createError } from 'h3'
import { hashRefreshToken, getRefreshTokenData, storeRefreshTokenData } from '../utils/refreshToken'
import { useRuntimeConfig } from '#imports'
import type { CookieConfig, TokenRefreshConfig } from '../../types'
import { createLogger } from '../utils/logger'
import { recomputeCustomClaims } from '../utils/recomputeClaims'

const logger = createLogger('UpdateClaims')

/**
 * POST /auth/update-claims
 *
 * Recomputes custom JWT claims based on current user data.
 * Useful when user data changes (role, permissions, etc.) and claims need updating
 * without requiring the user to logout and login again.
 *
 * Process:
 * 1. Validates refresh token from cookie
 * 2. Verifies user owns the refresh token (authorization check)
 * 3. Re-executes global handler's customClaims callback
 * 4. Optionally re-executes onUserPersist for fresh DB data (if configured)
 * 5. Updates stored refresh token data with new claims
 * 6. User must call refresh() afterward to get a new JWT with updated claims
 *
 * Configuration:
 * - Requires: tokenRefresh.enableClaimsUpdate = true (default)
 * - Optional: tokenRefresh.recomputeOnUserPersist = true (fetch fresh DB data)
 *
 * Security:
 * - Requires valid refresh token cookie
 * - Users can only update their own claims
 * - Claims are recomputed via the same handler used during initial auth
 *
 * @returns Success response with message
 * @throws 401 if no refresh token or invalid token
 * @throws 403 if feature is disabled
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cookieConfig = config.nuxtAegis?.tokenRefresh?.cookie as CookieConfig
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  // Check if feature is enabled
  const enableClaimsUpdate = tokenRefreshConfig?.enableClaimsUpdate ?? true // Default: enabled
  if (!enableClaimsUpdate) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Claims update feature is disabled',
    })
  }

  // Get refresh token from cookie
  const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'
  const refreshToken = getCookie(event, cookieName)

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'No refresh token found',
    })
  }

  try {
    // Hash the refresh token to retrieve stored data
    const hashedRefreshToken = hashRefreshToken(refreshToken)

    // Retrieve stored refresh token data and metadata
    const storedRefreshToken = await getRefreshTokenData(hashedRefreshToken, event)

    // Validate token exists, not revoked, and not expired
    const isRevoked = storedRefreshToken?.isRevoked || false
    const isExpired = storedRefreshToken?.expiresAt ? (Date.now() > storedRefreshToken.expiresAt) : true

    if (!storedRefreshToken || isRevoked || isExpired) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      })
    }

    logger.debug(`Updating claims for user: ${storedRefreshToken.sub}`)

    // Recompute custom claims using the global handler
    const newCustomClaims = await recomputeCustomClaims(storedRefreshToken, event)

    // Update stored refresh token data with new claims
    await storeRefreshTokenData(
      hashedRefreshToken,
      {
        ...storedRefreshToken,
        customClaims: newCustomClaims,
      },
      event,
    )

    logger.debug('Claims updated successfully. User should call refresh() to get new JWT.')

    return {
      success: true,
      message: 'Claims updated successfully. Call refresh() to receive a new access token with updated claims.',
    }
  }
  catch (error) {
    // Re-throw if already an H3Error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Log and throw generic error
    logger.error('Claims update failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to update claims',
    })
  }
})
