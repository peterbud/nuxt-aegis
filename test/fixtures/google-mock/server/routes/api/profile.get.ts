import { defineEventHandler, getHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import * as jose from 'jose'

/**
 * Protected API Route - User Profile
 * Route: GET /api/profile
 *
 * This route is protected by Aegis authentication middleware.
 * It requires a valid JWT access token in the Authorization header.
 *
 * Used for testing:
 * - Aegis middleware correctly validates tokens
 * - Protected routes deny access without token
 * - Protected routes allow access with valid token
 * - Token payload data is accessible in handlers
 */
export default defineEventHandler(async (event) => {
  // Extract and verify JWT token manually for testing
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    })
  }

  const token = authHeader.substring(7)

  try {
    // Get secret from runtime config
    const config = useRuntimeConfig(event)
    const secret = config.nuxtAegis?.token?.secret || 'test_secret_key_for_jwt_signing_min_32_chars'

    // Verify JWT token using jose
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtVerify(token, secretKey)

    // If we get here, user is authenticated
    // Return user profile data from the JWT token
    return {
      authenticated: true,
      user: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        locale: payload.locale,
        // Include custom claims if present
        role: payload.role,
        permissions: payload.permissions,
      },
    }
  }
  catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }
})
