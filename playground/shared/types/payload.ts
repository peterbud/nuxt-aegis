/**
 * Custom Token Payload Types
 *
 * Define your application-specific token payload types here.
 * These can be imported and used with getAuthUser<T>() for type-safe access to custom claims.
 *
 * @example
 * ```typescript
 * // In your server handler
 * import type { MyTokenPayload } from '~/types/payload'
 *
 * export default defineEventHandler((event) => {
 *   const user = getAuthUser<MyTokenPayload>(event)
 *   // TypeScript knows about role, permissions, organizationId
 *   return { role: user.role }
 * })
 * ```
 */

/**
 * Your application's token payload with custom claims
 */
export type MyTokenPayload = {
  // Standard JWT claims (from TokenPayload)
  sub: string
  email?: string
  name?: string
  picture?: string
  iss?: string
  aud?: string | string[]
  iat?: number
  exp?: number

  // Custom claims
  role: string
  permissions: string[]
  organizationId: string
}
