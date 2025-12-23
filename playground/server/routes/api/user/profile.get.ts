import type { AppTokenClaims } from '~~/shared/types/token'

/**
 * Example: API endpoint that demonstrates Bearer token authentication
 *
 * This endpoint can be accessed with a Bearer token in Authorization header
 * (API clients, mobile apps)
 *
 * The auth middleware automatically validates the token and injects user data
 */
export default defineEventHandler((event) => {
  // Use the generic type parameter to get fully typed custom claims
  const user = getAuthUser<AppTokenClaims>(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  // Access standard JWT claims (fully typed)
  return {
    success: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      // Access custom claims (fully typed thanks to generic parameter)
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
    },
    // Show authentication metadata
    authenticatedAt: user.iat,
    expiresAt: user.exp,
  }
})
