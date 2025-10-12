/**
 * Token refresh and cookie configuration types
 */

/**
 * Refresh cookie configuration
 */
export interface CookieConfig {
  /** Name of the refresh cookie (default: 'nuxt-aegis-refresh') */
  cookieName?: string
  /** Refresh cookie max age in seconds (default: 604800 - 7 days) */
  maxAge?: number
  /** Enable secure flag for cookies (default: true in production) */
  secure?: boolean
  /** SameSite cookie attribute (default: 'lax') */
  sameSite?: 'strict' | 'lax' | 'none'
  /** HttpOnly flag for cookies (default: true) */
  httpOnly?: boolean
  /** Cookie path (default: '/') */
  path?: string
  /** Cookie domain (optional) */
  domain?: string
}

/**
 * Token refresh configuration
 */
export interface TokenRefreshConfig {
  /** Enable automatic token refresh (default: true) */
  enabled?: boolean
  /** Automatically refresh tokens in the background (default: true) */
  automaticRefresh?: boolean
  /** Refresh token cookie configuration */
  cookie?: CookieConfig
}
