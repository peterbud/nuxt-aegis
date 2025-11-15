import type { H3Error, H3Event } from 'h3'

/**
 * Callback and error handler type definitions
 */

/**
 * Error handler callback type
 */
export type OnError = (event: H3Event, error: H3Error) => Promise<void> | void

/**
 * User information transformation hook
 * Called after fetching user info from the provider, before storing it
 * Allows provider-specific user object shaping
 *
 * @param user - Raw user object from the provider
 * @param tokens - Provider tokens (access_token, refresh_token, id_token, expires_in)
 * @param event - H3 event for server context access
 * @returns Shaped user object (must include at least { id: string, name?: string })
 */
export type OnUserInfo = (
  user: Record<string, unknown>,
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  },
  event: H3Event,
) => Promise<Record<string, unknown>> | Record<string, unknown>

/**
 * Success hook parameters
 */
export interface OnSuccessParams {
  /** Shaped user object (post-onUserInfo transformation) */
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
 * Success hook type
 * Called after successful authentication, before generating authorization CODE
 * Provider-agnostic hook for side effects like database storage
 *
 * @param params - Success hook parameters
 */
export type OnSuccess = (params: OnSuccessParams) => Promise<void> | void
