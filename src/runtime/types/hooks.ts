import type { H3Event } from 'h3'
import type { TokenPayload } from './token'

/**
 * Nitro hook type definitions for Nuxt Aegis
 * These hooks allow users to customize authentication behavior via server plugins
 */

/**
 * Payload for the nuxt-aegis:userInfo hook
 * Called after fetching user info from the provider, before storing it
 *
 * This receives the complete OAuth provider response, NOT the JWT payload
 */
export interface UserInfoHookPayload {
  /** Complete user object from OAuth provider (e.g., Google, GitHub, Microsoft) */
  providerUserInfo: Record<string, unknown>
  /** Provider tokens */
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  /** Provider name (e.g., 'google', 'github', 'microsoft', 'auth0') */
  provider: string
  /** H3 event for server context access */
  event: H3Event
}

/**
 * Payload for the nuxt-aegis:success hook
 * Called after successful authentication
 *
 * This receives the transformed OAuth provider data, NOT the JWT payload
 */
export interface SuccessHookPayload {
  /** Transformed provider user data (post-userInfo hook transformation) */
  providerUserInfo: Record<string, unknown>
  /** Provider tokens */
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  /** Provider name (e.g., 'google', 'github', 'microsoft', 'auth0') */
  provider: string
  /** H3 event for server context access */
  event: H3Event
}

/**
 * Payload for the nuxt-aegis:impersonate:check hook
 * Called to determine if a user is allowed to impersonate others
 */
export interface ImpersonateCheckPayload {
  /** JWT payload of the user requesting impersonation */
  requester: TokenPayload
  /** Target user ID to impersonate */
  targetUserId: string
  /** Optional reason for impersonation (for audit) */
  reason?: string
  /** H3 event for server context access */
  event: H3Event
  /** Client IP address (for audit) */
  ip: string
  /** User agent string (for audit) */
  userAgent: string
}

/**
 * Payload for the nuxt-aegis:impersonate:fetchTarget hook
 * Called to fetch the target user's data
 *
 * This hook MUST be implemented by the user to return the target user's data
 */
export interface ImpersonateFetchTargetPayload {
  /** JWT payload of the user requesting impersonation */
  requester: TokenPayload
  /** Target user ID to impersonate */
  targetUserId: string
  /** H3 event for server context access */
  event: H3Event
}

/**
 * Payload for the nuxt-aegis:impersonate:start hook
 * Called after impersonation starts successfully (fire-and-forget for audit logging)
 */
export interface ImpersonateStartPayload {
  /** JWT payload of the user who initiated impersonation */
  requester: TokenPayload
  /** JWT payload of the impersonated user */
  targetUser: TokenPayload
  /** Reason for impersonation */
  reason?: string
  /** H3 event for server context access */
  event: H3Event
  /** Client IP address (for audit) */
  ip: string
  /** User agent string (for audit) */
  userAgent: string
  /** Timestamp of impersonation */
  timestamp: Date
}

/**
 * Payload for the nuxt-aegis:impersonate:end hook
 * Called after impersonation ends successfully (fire-and-forget for audit logging)
 */
export interface ImpersonateEndPayload {
  /** JWT payload of the restored original user */
  restoredUser: TokenPayload
  /** JWT payload of the user who was being impersonated */
  impersonatedUser: TokenPayload
  /** H3 event for server context access */
  event: H3Event
  /** Client IP address (for audit) */
  ip: string
  /** User agent string (for audit) */
  userAgent: string
  /** Timestamp when impersonation ended */
  timestamp: Date
}
