import type { CustomTokenClaims } from '#nuxt-aegis'

/**
 * Application-specific token payload
 *
 * This minimal example uses only the standard BaseTokenClaims fields
 * without any custom claims.
 *
 * @example
 * ```typescript
 * const { user } = useAuth<AppTokenClaims>()
 * console.log(user.value?.email) // Standard JWT claims are fully typed
 * ```
 */
export type AppTokenClaims = CustomTokenClaims<Record<string, never>>
