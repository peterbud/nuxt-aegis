/**
 * Example: API endpoint that demonstrates Bearer token authentication
 *
 * This endpoint can be accessed with a Bearer token in Authorization header
 * (API clients, mobile apps)
 *
 * The auth middleware automatically validates the token and injects user data
 */
export default defineEventHandler((event) => {
  // getAuthUser() ensures user is authenticated and returns the typed user object
  const user = getAuthUser(event)

  // Access standard JWT claims
  return {
    success: true,
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    // Access custom claims if they exist
    role: user.role,
    permissions: user.permissions,
    organizationId: user.organizationId,
    // Show authentication metadata
    authenticatedAt: user.iat,
    expiresAt: user.exp,
  }
})
