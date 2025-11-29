import { defineEventHandler, createError, getRequestURL, getHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import { verifyToken } from '../utils/jwt'
import type { TokenConfig } from '../../types'
import { isRouteMatch } from '../../app/utils/routeMatching'
import { createLogger } from '../utils/logger'

const logger = createLogger('Middleware')

/**
 * Authentication middleware for Nuxt Aegis
 * Validates JWT tokens and protects routes according to configuration
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const requestURL = getRequestURL(event)

  // Get configuration with proper defaults
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const protectedRoutes = config.nuxtAegis?.routeProtection?.protectedRoutes as string[] || []
  const publicRoutes = config.nuxtAegis?.routeProtection?.publicRoutes as string[] || []
  const authPath = config.public.nuxtAegis.authPath

  // Skip authentication for auth routes (login, callback, etc.)
  if (requestURL.pathname.startsWith(authPath)) {
    return
  }

  // Skip authentication for static assets and API routes that shouldn't be protected
  if (requestURL.pathname.startsWith('/_nuxt/') || requestURL.pathname.startsWith('/api/_')) {
    return
  }

  // Check if route should be protected or public
  const isPublicRoute = isRouteMatch(requestURL.pathname, publicRoutes)

  // MW-14: If route is explicitly public, skip authentication
  if (isPublicRoute) {
    return
  }

  // Check if route should be protected
  const isProtectedRoute = isRouteMatch(requestURL.pathname, protectedRoutes)

  // MW-15: If route is not explicitly protected, skip
  if (!isProtectedRoute) {
    return
  }

  // Try to extract token
  let token: string | undefined

  // Try to read from Authorization header (Bearer token)
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  if (!token) {
    // MW-5: Return 401 if no token found
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  // Verify the token
  if (!tokenConfig || !tokenConfig.secret) {
    logger.error('Token configuration is missing')
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Authentication configuration error',
    })
  }

  // MW-1, MW-2, MW-3: Validate JWT (signature, expiration)
  const payload = await verifyToken(token, tokenConfig.secret)

  if (!payload) {
    // EH-2: Log failure reason at debug level
    logger.debug('Token verification failed for path:', requestURL.pathname)

    // MW-5: Return 401 if JWT is invalid or expired
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }

  // MW-4: Verify the token's issuer claim matches the configured issuer
  if (tokenConfig.issuer && payload.iss !== tokenConfig.issuer) {
    logger.debug('Token issuer mismatch. Expected:', tokenConfig.issuer, 'Got:', payload.iss)

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid token issuer',
    })
  }

  // Verify the token's audience claim if configured
  if (tokenConfig.audience && payload.aud) {
    const audienceMatch = Array.isArray(payload.aud)
      ? payload.aud.includes(tokenConfig.audience)
      : payload.aud === tokenConfig.audience

    if (!audienceMatch) {
      logger.debug('Token audience mismatch. Expected:', tokenConfig.audience, 'Got:', payload.aud)

      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid token audience',
      })
    }
  }

  // MW-9, MW-10, MW-11: Inject decoded user data into request context
  event.context.user = payload

  // If impersonating, also inject original user data for audit trails and permission checks
  if (payload.impersonation) {
    event.context.originalUser = {
      sub: payload.impersonation.originalUserId,
      email: payload.impersonation.originalUserEmail,
      name: payload.impersonation.originalUserName,
    }
  }
})
