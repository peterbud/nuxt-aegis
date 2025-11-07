import { defineMockGoogleEventHandler } from '../../providers/mockGoogle'

/**
 * Mock Google OAuth Authentication Route
 * Route: GET /auth/google
 *
 * This route initiates the OAuth flow using the MOCK Google provider.
 * It uses the exact same Aegis logic as a real Google provider,
 * but redirects to local mock endpoints instead of real Google.
 *
 * Flow:
 * 1. User/test navigates to /auth/google
 * 2. Aegis redirects to /mock-google/authorize (instead of accounts.google.com)
 * 3. Mock Google auto-approves and redirects back with code
 * 4. Aegis exchanges code with /mock-google/token (instead of oauth2.googleapis.com)
 * 5. Aegis fetches user from /mock-google/userinfo (instead of googleapis.com)
 * 6. Aegis generates JWT tokens and redirects to /auth/callback
 *
 * This allows testing the complete OAuth flow without external dependencies.
 */
export default defineMockGoogleEventHandler({
  // Optional: Add custom claims to the JWT tokens
  // These will be merged into the JWT payload after authentication
  customClaims: {
    role: 'user',
    permissions: ['read', 'write'],
  },

  // Optional: Error handler for OAuth errors
  // onError: async (error, event) => {
  //   console.error('OAuth error:', error)
  //   // Custom error handling logic
  // },
})
