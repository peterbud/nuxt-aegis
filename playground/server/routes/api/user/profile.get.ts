/**
 * Example: API endpoint that demonstrates Bearer token authentication
 *
 * This endpoint can be accessed with:
 * 1. Cookie-based auth (browser)
 * 2. Bearer token in Authorization header (API clients, mobile apps)
 *
 * The auth middleware automatically validates the token and injects user data
 */
export default defineEventHandler((event) => {
  // User data is automatically injected by the auth middleware
  // regardless of whether authentication came from cookie or Bearer token
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

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
    // Show authentication metadata
    authenticatedAt: user.iat,
    expiresAt: user.exp,
  }
})

/**
 * Usage examples:
 *
 * 1. Browser (cookie-based):
 * ```typescript
 * const profile = await $fetch('/api/user/profile')
 * ```
 *
 * 2. Mobile App (Bearer token):
 * ```typescript
 * const response = await fetch('https://api.example.com/api/user/profile', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * })
 * ```
 *
 * 3. CLI Tool (Bearer token):
 * ```bash
 * curl -H "Authorization: Bearer eyJhbGci..." \
 *   https://api.example.com/api/user/profile
 * ```
 */
