/**
 * Mock OAuth Authentication Route
 * Route: GET /auth/google
 *
 * This route initiates the OAuth flow using the built-in MOCK provider.
 * It uses the exact same Aegis logic as a real OAuth provider,
 * but redirects to local mock endpoints instead of external services.
 *
 * Flow:
 * 1. User/test navigates to /auth/google
 * 2. Aegis redirects to /auth/mock/authorize (local mock endpoint)
 * 3. Mock provider auto-approves and redirects back with code
 * 4. Aegis exchanges code with /auth/mock/token (local mock endpoint)
 * 5. Aegis fetches user from /auth/mock/userinfo (local mock endpoint)
 * 6. Aegis generates JWT tokens and redirects to /auth/callback
 *
 * This allows testing the complete OAuth flow without external dependencies.
 */
export default defineOAuthMockEventHandler({
  customClaims: providerUserInfo => ({
    role: providerUserInfo.role as string | undefined,
    permissions: providerUserInfo.permissions as string[] | undefined,
    userId: providerUserInfo.userId as string | undefined,
    userName: providerUserInfo.userName as string | undefined,
    subscriptionTier: providerUserInfo.subscriptionTier as string | undefined,
    subscriptionStatus: providerUserInfo.subscriptionStatus as string | undefined,
    preferredLanguage: providerUserInfo.preferredLanguage as string | undefined,
  }),

  // Optional: Error handler for OAuth errors
  // onError: async (error, event) => {
  //   console.error('OAuth error:', error)
  //   // Custom error handling logic
  // },
})
