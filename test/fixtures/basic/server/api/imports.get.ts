import { randomUUID } from 'node:crypto'
import { defineEventHandler } from 'nuxt/server'
import * as aegis from '#nuxt-aegis/server'
import type { AegisHandler, UserPersistContext, OAuthProviderImplementation } from '#nuxt-aegis/server'
import type { PublicSharedTypes, NoSharedRuntimeExports } from '#shared/types/public-api.type-test'

export type PublicServerTypes = [AegisHandler, UserPersistContext, OAuthProviderImplementation, PublicSharedTypes, NoSharedRuntimeExports]

export default defineEventHandler(() => ({
  requestId: randomUUID(),
  exports: Object.keys(aegis).sort(),
  autoImportsMatch: [
    requireAuth === aegis.requireAuth,
    getAuthUser === aegis.getAuthUser,
    generateAuthTokens === aegis.generateAuthTokens,
    revokeRefreshToken === aegis.revokeRefreshToken,
    deleteUserRefreshTokens === aegis.deleteUserRefreshTokens,
    recomputeCustomClaims === aegis.recomputeCustomClaims,
    defineAegisHandler === aegis.defineAegisHandler,
    useAegisHandler === aegis.useAegisHandler,
    defineOAuthGoogleEventHandler === aegis.defineOAuthGoogleEventHandler,
    defineOAuthGithubEventHandler === aegis.defineOAuthGithubEventHandler,
    defineOAuthAuth0EventHandler === aegis.defineOAuthAuth0EventHandler,
    defineOAuthMockEventHandler === aegis.defineOAuthMockEventHandler,
  ].every(Boolean),
}))
