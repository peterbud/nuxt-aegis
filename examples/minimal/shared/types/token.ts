import type { CustomTokenClaims } from 'nuxt-aegis'

/**
 * Application-specific token payload
 *
 * This minimal example uses only the standard TokenPayload fields
 * without any custom claims.
 *
 * @example
 * ```typescript
 * const { user } = useAuth<AppTokenPayload>()
 * console.log(user.value?.email) // Standard JWT claims are fully typed
 * ```
 */
export type AppTokenPayload = CustomTokenClaims
