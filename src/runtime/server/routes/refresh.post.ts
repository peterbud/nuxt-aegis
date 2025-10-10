import { defineEventHandler, getCookie, createError } from 'h3'
import { getHeader, useRuntimeConfig, useStorage } from '#imports'
import { generateToken, generateAndStoreRefreshToken, hashRefreshToken, verifyToken, setRefreshTokenCookie } from '../utils'
import type { TokenConfig, CookieConfig, TokenPayload, RefreshTokenData, TokenRefreshConfig } from '../../types'

/**
 * POST /auth/refresh
 * EP-19: Refresh endpoint to obtain new access tokens
 * EP-20: Generate new JWT when valid refresh token provided
 * EP-21: Return 401 when refresh token is invalid or expired
 */
export default defineEventHandler(async (event) => {
  console.log('[Nuxt Aegis] /auth/refresh endpoint called')
  const config = useRuntimeConfig()
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
    // EP-21: Return 401 when no token provided
    return
    // throw createError({
    //   statusCode: 401,
    //   statusMessage: 'Unauthorized',
    //   message: 'No authentication token found',
    // })
  }

  // Try to read from Authorization header (Bearer token)
  // which might be stale
  let accessToken: string | undefined
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    // Remove 'Bearer ' prefix
    accessToken = authHeader.substring(7)
  }

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'No access token provided',
    })
  }

  try {
    // Verify the current token (even if expired, we can still extract payload for refresh)
    const payload = await verifyToken(accessToken, tokenConfig.secret, false)

    if (!payload) {
      // EP-21: Return 401 when token is invalid
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid authentication token',
      })
    }

    // retrieve the persisted data for refresh token
    const hashedRefreshToken = await hashRefreshToken(refreshToken)
    const storedRefreshToken = await useStorage('refreshTokenStore').getItem<RefreshTokenData>(hashedRefreshToken)

    const isRevoked = storedRefreshToken?.isRevoked || false
    const isExpired = storedRefreshToken?.expiresAt ? (Date.now() > storedRefreshToken.expiresAt) : true
    const isDifferentSubject = storedRefreshToken?.sub !== payload.sub

    if (!storedRefreshToken || isRevoked || isExpired || isDifferentSubject) {
      // EP-21: Return 401 when token is invalid
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid or revoked refresh token',
      })
    }

    // EP-20: Generate new JWT with same claims
    const newPayload: TokenPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      // Preserve any custom claims
      ...Object.fromEntries(
        Object.entries(payload).filter(([key]) =>
          !['sub', 'email', 'name', 'picture', 'iss', 'aud', 'iat', 'exp', 'nbf', 'jti'].includes(key),
        ),
      ),
    }

    const newToken = await generateToken(newPayload, tokenConfig)
    const newRefreshToken = await generateAndStoreRefreshToken(payload.sub, tokenRefreshConfig, hashedRefreshToken)
    setRefreshTokenCookie(event, newRefreshToken, cookieConfig)

    // revoke the old refresh token
    storedRefreshToken.isRevoked = true
    await useStorage('refreshTokenStore').setItem<RefreshTokenData>(hashedRefreshToken, storedRefreshToken)

    return {
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newToken,
    }
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
