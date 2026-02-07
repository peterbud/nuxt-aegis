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
 * Encryption configuration for refresh token storage
 */
export interface EncryptionConfig {
  /** SC-16: Enable encryption-at-rest for user data (default: false) */
  enabled?: boolean
  /** SC-18: Encryption key (loaded from environment variable) */
  key?: string
  /** SC-17: Encryption algorithm (default: 'aes-256-gcm') */
  algorithm?: 'aes-256-gcm'
}

/**
 * Storage configuration for refresh tokens
 */
export interface StorageConfig {
  /** RS-10: Storage driver to use (default: 'fs' for filesystem) */
  driver?: 'fs' | 'redis' | 'memory'
  /** Key prefix for refresh tokens in storage (default: 'refresh:') */
  prefix?: string
  /** Base path for filesystem storage (default: './.data/refresh-tokens') */
  base?: string
}

/**
 * Token refresh configuration
 */
export interface TokenRefreshConfig {
  /** Enable automatic token refresh (default: true) */
  enabled?: boolean
  /** Automatically refresh tokens in the background (default: true) */
  automaticRefresh?: boolean
  /** Enable refresh token rotation on every refresh (default: true) */
  rotationEnabled?: boolean
  /** Enable claims update endpoint and functionality (default: true) */
  enableClaimsUpdate?: boolean
  /** Re-execute onUserPersist hook when updating claims for fresh database data (default: false) */
  recomputeOnUserPersist?: boolean
  /** Refresh token cookie configuration */
  cookie?: CookieConfig
  /** Encryption configuration for stored user data */
  encryption?: EncryptionConfig
  /** Storage configuration */
  storage?: StorageConfig
  /** Token lifetime for server-generated access tokens during SSR (default: '5m') */
  ssrTokenExpiry?: string
}
