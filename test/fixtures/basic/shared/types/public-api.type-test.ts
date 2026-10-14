import type { BaseTokenClaims, JSONValue, PasswordProviderConfig, OAuthTransactionConfig } from '#nuxt-aegis/types'

type Assert<Condition extends true> = Condition

export type PublicSharedTypes = [BaseTokenClaims, JSONValue, PasswordProviderConfig, OAuthTransactionConfig]
export type NoSharedRuntimeExports = Assert<keyof typeof import('#nuxt-aegis/types') extends never ? true : false>
