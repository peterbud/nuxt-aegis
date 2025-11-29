import { defineEventHandler, createError, getHeader, setCookie } from 'h3'
import { verifyToken } from '../utils/jwt'
import { endImpersonation } from '../utils/impersonation'
import { useRuntimeConfig } from '#imports'
import type { CookieConfig } from '../../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('Unimpersonate')

/**
 * POST /auth/unimpersonate
 * Ends impersonation and restores the original user session
 *
 * Response:
 * - accessToken: string - JWT for restored original session
 * - Sets refresh token cookie for normal session
 *
 * Requirements:
 * - Impersonation feature must be enabled
 * - Current session must be impersonated
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Check if impersonation feature is enabled
  if (!config.nuxtAegis?.impersonation?.enabled) {
    throw createError({
      statusCode: 404,
      message: 'Impersonation feature is not enabled',
    })
  }

  try {
    // Get current token from auth header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required',
      })
    }

    const token = authHeader.substring(7)
    const tokenConfig = config.nuxtAegis?.token

    if (!tokenConfig?.secret) {
      throw createError({
        statusCode: 500,
        message: 'Token configuration is missing',
      })
    }

    // Verify current token
    const currentToken = await verifyToken(token, tokenConfig.secret)
    if (!currentToken) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or expired token',
      })
    }

    // End impersonation and get restored session
    const { accessToken, refreshTokenId } = await endImpersonation(currentToken, event)

    // Set refresh token cookie for normal session
    const cookieConfig = config.nuxtAegis?.tokenRefresh?.cookie as CookieConfig
    const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'

    setCookie(event, cookieName, refreshTokenId, {
      httpOnly: true,
      secure: cookieConfig?.secure ?? true,
      sameSite: cookieConfig?.sameSite || 'lax',
      path: cookieConfig?.path || '/',
      maxAge: cookieConfig?.maxAge,
      domain: cookieConfig?.domain,
    })

    logger.security('Impersonation ended', {
      originalUser: currentToken.impersonation?.originalUserId,
      wasImpersonating: currentToken.sub,
    })

    return { accessToken }
  }
  catch (error: unknown) {
    logger.error('Unimpersonate failed:', error)

    const err = error as { statusCode?: number, message?: string }
    if (err.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to end impersonation',
    })
  }
})
