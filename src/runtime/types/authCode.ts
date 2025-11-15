/**
 * Authorization Code Flow Types
 * Types for the CODE-based authentication flow
 */

/**
 * Authorization code data stored in the key-value store
 * CS-2: Associates CODE with user information and provider tokens
 */
export interface AuthCodeData {
  /** User information extracted from OAuth provider */
  user: Record<string, unknown>
  /** Provider tokens received from OAuth provider */
  providerTokens: {
    /** OAuth provider access token */
    access_token: string
    /** Optional OAuth provider refresh token */
    refresh_token?: string
    /** Optional OAuth provider ID token (OpenID Connect) */
    id_token?: string
    /** Optional token expiration time in seconds */
    expires_in?: number
  }
  /** Timestamp when the code expires (milliseconds since epoch) */
  expiresAt: number
  /** Timestamp when the code was created (milliseconds since epoch) */
  createdAt: number
  /** Provider name (e.g., 'google', 'github', 'microsoft', 'auth0') */
  provider: string
  /** Resolved custom claims (already processed from static or callback config) */
  customClaims?: Record<string, unknown>
}

/**
 * Request body for token exchange endpoint
 * Client sends this to /auth/token to exchange CODE for tokens
 */
export interface TokenExchangeRequest {
  /** Authorization code received from OAuth callback */
  code: string
}

/**
 * Response from token exchange endpoint
 * EP-15: Server returns access token in JSON response body
 */
export interface TokenExchangeResponse {
  /** JWT access token for API authentication */
  accessToken: string
  /** Token type, always "Bearer" for JWT */
  tokenType: 'Bearer'
  /** Optional expiration time in seconds */
  expiresIn?: number
}

/**
 * Configuration for authorization code flow
 * CF-9: Configurable authorization CODE expiration time
 */
export interface AuthCodeConfig {
  /**
   * Expiration time for authorization codes in seconds
   * @default 60
   */
  expiresIn: number
}
