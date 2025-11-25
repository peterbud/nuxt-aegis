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
  // Optional: Add route-specific custom claims
  // These will be merged with the user persona data
  customClaims: {
    app: 'nuxt-aegis-playground',
    environment: 'development',
  },
})
