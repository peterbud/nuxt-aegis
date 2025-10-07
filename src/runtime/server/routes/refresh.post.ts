import { defineEventHandler, getCookie, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { verifyToken, generateToken, setTokenCookie } from '../utils'
import type { TokenConfig, SessionConfig, TokenPayload } from '../../types'

/**
 * POST /auth/refresh
 * EP-19: Refresh endpoint to obtain new access tokens
 * EP-20: Generate new JWT when valid refresh token provided
 * EP-21: Return 401 when refresh token is invalid or expired
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const sessionConfig = config.nuxtAegis?.session as SessionConfig
  const tokenConfig = config.nuxtAegis?.token as TokenConfig

  if (!tokenConfig || !tokenConfig.secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Token configuration is missing',
    })
  }

  // Get current token from cookie
  const cookieName = sessionConfig?.cookieName || 'nuxt-aegis-session'
  const currentToken = getCookie(event, cookieName)

  if (!currentToken) {
    // EP-21: Return 401 when no token provided
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'No authentication token found',
    })
  }

  try {
    // Verify the current token (even if expired, we can still extract payload for refresh)
    const payload = await verifyToken(currentToken, tokenConfig.secret)

    if (!payload) {
      // EP-21: Return 401 when token is invalid
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid authentication token',
      })
    }

    // Check if token is close to expiry or expired (refresh threshold)
    const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh
    const refreshThreshold = tokenRefreshConfig?.threshold || 300 // 5 minutes default
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = payload.exp || 0

    // Only refresh if token is within threshold or expired
    if (expiresAt - now > refreshThreshold) {
      return {
        success: false,
        message: 'Token refresh not needed yet',
        expiresIn: expiresAt - now,
      }
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

    // Set the new token as cookie
    setTokenCookie(event, newToken, sessionConfig)

    return {
      success: true,
      message: 'Token refreshed successfully',
    }
  }
  catch (error) {
    if (import.meta.dev) {
      console.error('[Nuxt Aegis] Token refresh error:', error)
    }

    // EP-21: Return 401 for any refresh errors
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Token refresh failed',
    })
  }
})
