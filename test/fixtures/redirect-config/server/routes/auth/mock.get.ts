/**
 * Mock OAuth Authentication Route for Redirect Config Tests
 * Route: GET /auth/mock
 *
 * This route initiates the OAuth flow using the built-in MOCK provider.
 * It's used to test redirect configuration behavior during authentication.
 */
export default defineOAuthMockEventHandler({
  customClaims: {
    role: 'user',
  },
})
