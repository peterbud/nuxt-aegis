import { defineEventHandler, createError, getRequestURL, getHeader } from 'h3'
import { getRouteRules, useRuntimeConfig } from '#imports'
import { verifyToken } from '../utils/jwt'
import type { TokenConfig, NuxtAegisRouteRules, BaseTokenClaims } from '../../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('Middleware')

/**
 * Authentication middleware for Nuxt Aegis
 * Validates JWT tokens and protects routes according to Nitro route rules
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const requestURL = getRequestURL(event)

  logger.debug('Auth middleware triggered for URL:', requestURL.pathname)
  // Get configuration with proper defaults
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const authPath = config.public.nuxtAegis.authPath

  // Skip authentication for auth routes (login, callback, etc.)
  if (requestURL.pathname.startsWith(authPath)) {
    return
  }

  // Skip authentication for static assets and internal API routes
  if (requestURL.pathname.startsWith('/_nuxt/') || requestURL.pathname.startsWith('/api/_')) {
    return
  }

  // Get route rules for this request
  const routeRules = (await getRouteRules(event)) as Record<string, unknown> & { nuxtAegis?: NuxtAegisRouteRules }
  const authConfig = routeRules.nuxtAegis?.auth

  // Normalize auth value
  // true | 'required' | 'protected' => protect route (require authentication)
  // false | 'public' | 'skip' => public route (optional authentication)
  // undefined => public route (opt-in behavior, optional authentication)
  const shouldProtect = authConfig === true || authConfig === 'required' || authConfig === 'protected'

  // Always try to extract token from the request
  let token: string | undefined

  // Try to read from Authorization header (Bearer token)
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  // If no token is present
  // Only throw 401 if route is protected
  if (!token) {
    if (shouldProtect) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Authentication required',
      })
    }
    // For public routes without token, continue without authentication
    return
  }

  // At this point, we have a token to verify
  if (!tokenConfig || !tokenConfig.secret) {
    logger.error('Token configuration is missing')
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Authentication configuration error',
    })
  }

  // Verify JWT signature and expiration
  const payload = await verifyToken(token, tokenConfig.secret)

  if (!payload) {
    logger.debug('Token verification failed for path:', requestURL.pathname)

    // Only throw 401 if route is protected
    if (shouldProtect) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid or expired token',
      })
    }
    // For public routes, continue without authentication
    return
  }

  // Verify the token's issuer claim if configured
  if (tokenConfig.issuer && payload.iss !== tokenConfig.issuer) {
    logger.debug('Token issuer mismatch. Expected:', tokenConfig.issuer, 'Got:', payload.iss)

    // Only throw 401 if route is protected
    if (shouldProtect) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Invalid token issuer',
      })
    }
    // For public routes, continue without authentication
    return
  }

  // Verify the token's audience claim if configured
  if (tokenConfig.audience && payload.aud) {
    const audienceMatch = Array.isArray(payload.aud)
      ? payload.aud.includes(tokenConfig.audience)
      : payload.aud === tokenConfig.audience

    if (!audienceMatch) {
      logger.debug('Token audience mismatch. Expected:', tokenConfig.audience, 'Got:', payload.aud)

      // Only throw 401 if route is protected
      if (shouldProtect) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized',
          message: 'Invalid token audience',
        })
      }
      // For public routes, continue without authentication
      return
    }
  }

  // Token is valid - ALWAYS set context.user (for both protected and public routes)
  // Filter JWT metadata claims (iat, exp, iss, aud) to prevent hydration mismatches
  // These are token metadata, not user properties
  const { iat, exp, iss, aud, ...userData } = payload
  event.context.user = userData as BaseTokenClaims

  // If impersonating, also inject original user data for audit trails and permission checks
  if (payload.impersonation) {
    event.context.originalUser = {
      sub: payload.impersonation.originalUserId,
      email: payload.impersonation.originalUserEmail,
      name: payload.impersonation.originalUserName,
    }
  }
})
