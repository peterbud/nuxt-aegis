/**
 * Mock OAuth Authentication Route
 * Route: GET /auth/mock
 *
 * This route demonstrates the built-in mock authentication provider.
 * Perfect for local development and testing without real OAuth credentials.
 *
 * Usage:
 * - /auth/mock - Login as default user (regular user)
 * - /auth/mock?user=admin - Login as admin user
 * - /auth/mock?user=premium - Login as premium user
 * - /auth/mock?mock_error=access_denied - Test error handling
 *
 * User personas are defined in playground/nuxt.config.ts
 */
export default defineOAuthMockEventHandler({
  // Extract custom claims from the user persona dynamically
  // This ensures role, permissions, and other custom fields appear in the JWT
  customClaims: (providerUserInfo) => {
    const claims: Record<string, string | number | boolean | Array<string | number | boolean> | null> = {
      app: 'nuxt-aegis-playground',
      environment: 'development',
    }

    // Extract custom fields from the mock user profile
    // Standard OpenID Connect fields (sub, email, name, picture) are handled automatically
    // Add any additional fields to the JWT
    const userInfo = providerUserInfo as Record<string, unknown>

    // Add role if present
    if (userInfo.role && typeof userInfo.role === 'string') {
      claims.role = userInfo.role
    }

    // Add permissions if present
    if (Array.isArray(userInfo.permissions)) {
      claims.permissions = userInfo.permissions as string[]
    }

    // Add other custom fields (for premium user)
    if (userInfo.subscription && typeof userInfo.subscription === 'string') {
      claims.subscription = userInfo.subscription
    }
    if (userInfo.tier && typeof userInfo.tier === 'string') {
      claims.tier = userInfo.tier
    }
    if (userInfo.credits && typeof userInfo.credits === 'number') {
      claims.credits = userInfo.credits
    }
    if (userInfo.organizationId && typeof userInfo.organizationId === 'string') {
      claims.organizationId = userInfo.organizationId
    }

    return claims
  },
})
