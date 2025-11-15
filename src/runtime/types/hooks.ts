import type { H3Event } from 'h3'

/**
 * Nitro hook type definitions for Nuxt Aegis
 * These hooks allow users to customize authentication behavior via server plugins
 */

/**
 * Payload for the nuxt-aegis:userInfo hook
 * Called after fetching user info from the provider, before storing it
 */
export interface UserInfoHookPayload {
  /** Raw user object from the provider */
  user: Record<string, unknown>
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
 */
export interface SuccessHookPayload {
  /** Shaped user object (post-transformation) */
  user: Record<string, unknown>
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
