import type { AppTokenPayload } from './token'

/**
 * Provider information for multi-provider authentication
 */
export interface Provider {
  /** Provider name (e.g., 'google', 'github', 'password') */
  name: string
  /** Provider-specific user ID */
  id: string
}

/**
 * Database user model
 *
 * This type represents the full user record as stored in the database.
 * It extends the JWT token payload with database-specific fields that
 * should NEVER be included in JWT tokens.
 *
 * ⚠️ IMPORTANT: Fields like `hashedPassword` belong here in the database
 * model, but should NEVER be included in AppTokenPayload (JWT tokens).
 *
 * @example Usage in database operations:
 * ```typescript
 * export function dbGetUserById(id: string): DatabaseUser | null {
 *   return users.find(u => u.id === id) || null
 * }
 * ```
 *
 * @example Mapping to JWT claims:
 * ```typescript
 * function userToTokenPayload(dbUser: DatabaseUser): AppTokenPayload {
 *   return {
 *     sub: dbUser.id,
 *     email: dbUser.email,
 *     name: dbUser.name,
 *     picture: dbUser.picture,
 *     role: dbUser.role,
 *     permissions: dbUser.permissions,
 *     organizationId: dbUser.organizationId,
 *     // Note: hashedPassword is deliberately excluded
 *   }
 * }
 * ```
 */
export interface DatabaseUser extends AppTokenPayload {
  /** Database record ID */
  id: string
  /** Account creation timestamp */
  createdAt: string
  /** Last login timestamp */
  lastLogin: string
  /** Linked authentication providers */
  providers?: Provider[]
  /** Hashed password (for password authentication) - NEVER include in JWT! */
  hashedPassword?: string
}
