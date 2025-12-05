/**
 * Token-related type definitions
 * Handles JWT tokens, payloads, and token validation
 */

/**
 * Minimal user interface contract
 * All user objects must conform to this shape at minimum
 * Providers can extend with additional provider-specific fields
 */
export interface BaseUser {
  /** User identifier - required */
  id: string
  /** User display name - optional but recommended */
  name?: string
  /** Additional provider-specific or custom fields */
  [key: string]: unknown
}

/**
 * Impersonation context stored in JWT
 * Contains essential information about the original user when impersonating
 */
export interface ImpersonationContext {
  /** Original user ID (sub) who is performing the impersonation */
  originalUserId: string
  /** Original user email */
  originalUserEmail?: string
  /** Original user name */
  originalUserName?: string
  /** Timestamp when impersonation started */
  impersonatedAt: string
  /** Optional reason for impersonation (debugging, support, etc.) */
  reason?: string
  /** Original user's complete claims (role, permissions, etc.) for restoration */
  originalClaims?: Record<string, unknown>
}

/**
 * JWT Token payload interface
 * Represents the decoded JWT token structure with standard and custom claims
 * This is what gets stored in the JWT and attached to event.context.user
 */
export interface TokenPayload {
  /** Subject identifier (user ID) - required claim */
  sub: string
  /** User email address */
  email?: string
  /** User full name */
  name?: string
  /**
   * User profile picture URL.
   * Pay attention if it's a base64 string image, it can create huge payloads
   * Better to use a URL pointing to the image location or leave it empty
   */
  picture?: string
  /** Provider name (e.g., 'google', 'github', 'microsoft', 'auth0', 'password', 'mock') */
  provider?: string
  /** Issuer claim - identifies who issued the token */
  iss?: string
  /** Audience claim - identifies the recipients of the token */
  aud?: string | string[]
  /** Issued at timestamp - when the token was created */
  iat?: number
  /** Expiration timestamp - when the token expires */
  exp?: number
  /** Impersonation context if this token represents an impersonated session */
  impersonation?: ImpersonationContext
  /** Additional custom claims */
  [key: string]: unknown
}

/**
 * Refresh token stored data interface
 * Represents the data stored alongside a refresh token
 * on the server side for validation and management
 */
export interface RefreshTokenData {
  /** Subject identifier, links the token back to the specific user account */
  sub: string
  /** Timestamp when the refresh token expires */
  expiresAt: number
  /** Allows for immediate revocation if the user logs out, changes a password, or a security event occurs */
  isRevoked: boolean
  /** Hash of the previous refresh token for rotation tracking */
  previousTokenHash?: string
  /** Complete OAuth provider user data - NOT the JWT payload. This is the full user object from the provider (Google, GitHub, etc.) */
  providerUserInfo: Record<string, unknown>
  /** Provider name for dynamic custom claims generation during refresh (e.g., 'google', 'github', 'microsoft', 'auth0') */
  provider: string
}

/**
 * Response from token refresh operation
 */
export interface RefreshResponse {
  success: boolean
  message: string
  accessToken?: string
}

/**
 * Token configuration
 */
export interface TokenConfig {
  /** JWT secret key */
  secret: string
  /** JWT expiration time (in seconds or as a string) */
  expiresIn?: string | number
  /** JWT algorithm (default: 'HS256') */
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'
  /** JWT issuer claim */
  issuer?: string
  /** JWT audience claim */
  audience?: string
}

/**
 * Claims validation configuration
 */
export interface ClaimsValidationConfig {
  /** Required claims that must be present in the JWT */
  requiredClaims?: string[]
  /** Custom claim validation rules */
  customRules?: Record<string, (value: unknown) => boolean>
}

/**
 * Custom claims callback function
 * Receives the full OAuth provider user data and tokens
 * Returns claims to add to the JWT (must be JWT-compatible types)
 *
 * @param providerUserInfo - Complete user object from OAuth provider
 * @param tokens - OAuth tokens from the provider
 * @returns Record of custom claims to add to the JWT
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomClaimsCallback<TProviderUserInfo = any, TTokens = any> = (
  providerUserInfo: TProviderUserInfo,
  tokens: TTokens
) => Record<string, string | number | boolean | Array<string | number | boolean> | null>
  | Promise<Record<string, string | number | boolean | Array<string | number | boolean> | null>>
