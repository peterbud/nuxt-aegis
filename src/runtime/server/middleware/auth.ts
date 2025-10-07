import { defineEventHandler, getCookie, createError, getRequestURL, getHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import { verifyToken } from '../utils'
import type { TokenConfig, SessionConfig } from '../../types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const requestURL = getRequestURL(event)

  // Get configuration
  const sessionConfig = config.nuxtAegis?.session as SessionConfig
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const protectedRoutes = config.nuxtAegis?.protectedRoutes as string[] || []
  const publicRoutes = config.nuxtAegis?.publicRoutes as string[] || []
  const globalMiddleware = config.nuxtAegis?.globalMiddleware as boolean || false
  const authPath = config.nuxtAegis?.authPath as string || '/auth'

  // Get the cookie name from runtime config
  const cookieName = sessionConfig?.cookieName || 'nuxt-aegis-session'

  // Skip authentication for auth routes (login, callback, etc.)
  if (requestURL.pathname.startsWith(authPath)) {
    return
  }

  // Check if route should be protected or public
  const isPublicRoute = publicRoutes.some((pattern) => {
    const regex = new RegExp(pattern.replace('*', '.*'))
    return regex.test(requestURL.pathname)
  })

  // If route is explicitly public, skip authentication
  if (isPublicRoute) {
    return
  }

  // Check if route should be protected
  const isProtectedRoute = protectedRoutes.some((pattern) => {
    const regex = new RegExp(pattern.replace('*', '.*'))
    return regex.test(requestURL.pathname)
  })

  // If global middleware is disabled and route is not explicitly protected, skip
  if (!globalMiddleware && !isProtectedRoute) {
    return
  }

  // Try to extract token from multiple sources
  let token: string | undefined

  // 1. Try to read from Authorization header (Bearer token)
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  // 2. Fall back to cookie if no Bearer token found
  if (!token) {
    token = getCookie(event, cookieName)
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
    console.error('Token configuration is missing')
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
    console.debug('Token verification failed for path:', requestURL.pathname)

    // MW-5: Return 401 if JWT is invalid or expired
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }

  // MW-4: Verify the token's issuer claim matches the configured issuer
  if (tokenConfig.issuer && payload.iss !== tokenConfig.issuer) {
    console.debug('Token issuer mismatch. Expected:', tokenConfig.issuer, 'Got:', payload.iss)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid token issuer',
    })
  }

  // MW-9, MW-10, MW-11: Inject decoded user data into request context
  event.context.user = payload
})
