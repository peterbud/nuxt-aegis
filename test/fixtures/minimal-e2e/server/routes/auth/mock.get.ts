/**
 * Mock OAuth route — initiates the full OAuth flow using the built-in mock provider.
 *
 * Flow: /auth/mock → /auth/mock/authorize → /auth/mock (callback with code)
 *       → /auth/mock/token → /auth/mock/userinfo → /auth/callback?code=<aegis_code>
 */
import { defineOAuthMockEventHandler } from '../../../../../../src/runtime/server/providers/mock'

export default defineOAuthMockEventHandler({
  customClaims: {
    role: 'member',
  },
})
