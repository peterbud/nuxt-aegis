import type { H3Event } from 'h3'
import type { UserInfoHookPayload } from '../../types/hooks'
import type { TokenPayload } from '../../types/token'

export interface AegisHandler {
  /**
   * Transform user data after fetching from OAuth provider.
   * Replaces `nuxt-aegis:userInfo` hook.
   * Return the modified user object to use it.
   */
  onUserInfo?: (payload: UserInfoHookPayload) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined

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
    canImpersonate?: (requester: TokenPayload, targetId: string, event: H3Event) => Promise<boolean> | boolean
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
