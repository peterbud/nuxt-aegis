import type { CustomTokenClaims } from '#nuxt-aegis'

/**
 * Application-specific token payload with custom claims
 *
 * This type represents what gets stored in the JWT token and is available
 * in both client-side (useAuth) and server-side (getAuthUser) contexts.
 *
 * @example Client-side usage:
 * ```typescript
 * const { user } = useAuth<AppTokenClaims>()
 * console.log(user.value?.role) // Type-safe access to custom claims
 * ```
 *
 * @example Server-side usage:
 * ```typescript
 * const user = getAuthUser<AppTokenClaims>(event)
 * return { role: user.role, permissions: user.permissions }
 * ```
 */
export type AppTokenClaims = CustomTokenClaims<{
  /** User role (e.g., 'admin', 'user', 'guest') */
  role: string
  /** Array of permission strings */
  permissions: string[]
  /** Organization or tenant ID */
  organizationId: string
}>
