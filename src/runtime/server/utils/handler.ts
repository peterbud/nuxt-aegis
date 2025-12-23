import type { H3Event } from 'h3'
import type { UserInfoHookPayload } from '../../types/hooks'
import type { BaseTokenClaims } from '../../types/token'
import type { PasswordUser } from '../../types/providers'

export interface AegisHandler {
  /**
   * Transform user data after fetching from OAuth provider.
   * Replaces `nuxt-aegis:userInfo` hook.
   * Return the modified user object to use it.
   */
  onUserInfo?: (payload: UserInfoHookPayload) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined

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
     * Create or update a user.
     * Called after successful registration or password change.
     */
    upsertUser: (user: PasswordUser) => Promise<void> | void

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
