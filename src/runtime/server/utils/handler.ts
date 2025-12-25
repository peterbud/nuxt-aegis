import type { H3Event } from 'h3'
import type { UserInfoHookPayload } from '../../types/hooks'
import type { BaseTokenClaims } from '../../types/token'
import type { PasswordUser } from '../../types/providers'

/**
 * Context passed to onUserPersist handler
 */
export interface UserPersistContext {
  /** Provider name (e.g., 'google', 'github', 'password') */
  provider: string
  /** H3 event for server context access */
  event: H3Event
}

export interface AegisHandler {
  /**
   * Transform user data after fetching from OAuth provider.
   * Return the modified user object to use it.
   */
  onUserInfo?: (payload: UserInfoHookPayload) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined

  /**
   * Persist user data to your database and return enriched user information.
   *
   * Called for:
   * - OAuth authentication: After provider data transformation, before JWT generation
   * - Password authentication: After registration, password change, or reset
   *
   * The returned object is merged into the user data and used for JWT claims.
   *
   * @param user - User data to persist (provider-specific fields vary)
   * @param context - Context with provider name and H3 event
   * @returns Enriched user object with database fields (e.g., userId, role, permissions)
   *
   * @example
   * ```typescript
   * onUserPersist: async (user, { provider, event }) => {
   *   // For password provider, user includes hashedPassword
   *   if (provider === 'password') {
   *     const dbUser = await db.users.upsert({
   *       where: { email: user.email },
   *       update: { hashedPassword: user.hashedPassword },
   *       create: { email: user.email, hashedPassword: user.hashedPassword },
   *     })
   *     return { userId: dbUser.id, role: dbUser.role }
   *   }
   *
   *   // For OAuth providers, link or create user
   *   const dbUser = await db.users.upsert({
   *     where: { email: user.email },
   *     update: { lastLogin: new Date() },
   *     create: { email: user.email, name: user.name, picture: user.picture },
   *   })
   *   return { userId: dbUser.id, role: dbUser.role, permissions: dbUser.permissions }
   * }
   * ```
   */
  onUserPersist?: (
    user: Record<string, unknown>,
    context: UserPersistContext,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>

  /**
   * Generate custom claims for JWT tokens.
   *
   * Called after onUserPersist, receives the merged user data.
   * This is the recommended location for adding database-driven claims.
   *
   * Provider-level customClaims (defined in route handlers) take precedence over this.
   *
   * @param user - Complete user object including data from onUserPersist
   * @returns Custom claims to add to the JWT
   *
   * @example
   * ```typescript
   * customClaims: async (user) => {
   *   return {
   *     role: user.role,
   *     permissions: user.permissions,
   *     organizationId: user.organizationId,
   *   }
   * }
   * ```
   */
  customClaims?: (
    user: Record<string, unknown>,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>

  /**
   * Password authentication handler.
   * Required if password provider is enabled.
   */
  password?: {
    /**
     * Find a user by email.
     * Used during login and registration checks.
     * Return null if user is not found.
     */
    findUser: (email: string) => Promise<PasswordUser | null> | PasswordUser | null

    /**
     * Send a verification code to the user.
     * Called during registration, login, and password reset.
     */
    sendVerificationCode: (email: string, code: string, action: 'register' | 'login' | 'reset') => Promise<void> | void

    /**
     * Validate password strength.
     * Override default validation logic.
     * Return true if valid, or an array of error messages.
     */
    validatePassword?: (password: string) => Promise<boolean | string[]> | boolean | string[]

    /**
     * Hash a password.
     * Override default bcrypt hashing.
     */
    hashPassword?: (password: string) => Promise<string> | string

    /**
     * Verify a password against a hash.
     * Override default bcrypt verification.
     */
    verifyPassword?: (password: string, hash: string) => Promise<boolean> | boolean
  }

  /**
   * Impersonation logic.
   * Replaces `nuxt-aegis:impersonate:check` and `nuxt-aegis:impersonate:fetchTarget` hooks.
   */
  impersonation?: {
    /**
     * Fetch the target user to be impersonated.
     * Must return a user object that will be used to generate the JWT.
     * Return null if user is not found.
     */
    fetchTarget: (targetId: string, event: H3Event) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null

    /**
     * Check if the requester is allowed to impersonate the target.
     * If not defined, defaults to allowing if fetchTarget returns a user.
     * You can throw an error here to provide a specific message.
     */
    canImpersonate?: (requester: BaseTokenClaims, targetId: string, event: H3Event) => Promise<boolean> | boolean
  }
}

let _handler: AegisHandler | null = null

/**
 * Registers the Aegis handler configuration.
 * Call this within a server plugin.
 */
export const defineAegisHandler = (handler: AegisHandler) => {
  _handler = handler
}

/**
 * Internal: Retrieves the registered handler.
 */
export const useAegisHandler = () => {
  return _handler
}
