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
import { sendRedirect } from 'nuxt/server'

export default defineOAuthMockEventHandler({
  onError: (event, error) => {
    event.res.headers.set('x-aegis-error-status', String(error.status))
    return sendRedirect(event, '/auth/callback?error=authentication_failed')
  },
  onUserInfo: (providerUserInfo, tokens, event) => {
    event.res.headers.set('x-aegis-user-info-tokens', String(Boolean(tokens.access_token && tokens.refresh_token && tokens.id_token && tokens.expires_in)))
    return providerUserInfo
  },
  onSuccess: ({ event, tokens }) => {
    event.res.headers.set('x-aegis-hook-order', 'provider')
    event.res.headers.set('x-aegis-provider-success-tokens', String(Boolean(tokens.access_token && tokens.refresh_token && tokens.id_token && tokens.expires_in)))
  },
  customClaims: (providerUserInfo, tokens) => ({
    providerTokensAvailable: Boolean(tokens.access_token && tokens.refresh_token && tokens.id_token && tokens.expires_in),
    role: (providerUserInfo.role as string | undefined) ?? null,
    permissions: (providerUserInfo.permissions as string[] | undefined) ?? null,
    userId: (providerUserInfo.userId as string | undefined) ?? null,
    userName: (providerUserInfo.userName as string | undefined) ?? null,
    subscriptionTier: (providerUserInfo.subscriptionTier as string | undefined) ?? null,
    subscriptionStatus: (providerUserInfo.subscriptionStatus as string | undefined) ?? null,
    preferredLanguage: (providerUserInfo.preferredLanguage as string | undefined) ?? null,
  }),

  // Optional: Error handler for OAuth errors
  // onError: async (error, event) => {
  //   console.error('OAuth error:', error)
  //   // Custom error handling logic
  // },
})
