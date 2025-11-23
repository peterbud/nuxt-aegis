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
 * This receives the complete OAuth provider response, NOT the JWT payload
 *
 * @param providerUserInfo - Complete user object from OAuth provider
 * @param tokens - Provider tokens (access_token, refresh_token, id_token, expires_in)
 * @param event - H3 event for server context access
 * @returns Transformed user object that will be stored and used for custom claims
 */
export type OnUserInfo = (
  providerUserInfo: Record<string, unknown>,
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
  /** Transformed provider user data (post-onUserInfo transformation) */
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
 * Success hook type
 * Called after successful authentication, before generating authorization CODE
 * Provider-agnostic hook for side effects like database storage
 *
 * This receives the transformed OAuth provider data, NOT the JWT payload
 *
 * @param params - Success hook parameters
 */
export type OnSuccess = (params: OnSuccessParams) => Promise<void> | void
