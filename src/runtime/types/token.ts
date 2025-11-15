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
 * JWT Token payload interface
 * Represents the decoded JWT token structure with standard and custom claims
 */
export interface TokenPayload {
  /** JT-6: Subject identifier (user ID) - required claim */
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
  /** JT-5: Issuer claim - identifies who issued the token */
  iss?: string
  /** JT-9: Audience claim - identifies the recipients of the token */
  aud?: string | string[]
  /** JT-8: Issued at timestamp - when the token was created */
  iat?: number
  /** JT-7: Expiration timestamp - when the token expires */
  exp?: number
  /** JT-10, JT-11, JT-13: Additional custom claims */
  [key: string]: unknown
}

/**
 * Refresh token stored data interface
 * Represents the data stored alongside a refresh token
 * on the server side for validation and management
 */
export interface RefreshTokenData {
  /** RS-4: Subject identifier, links the token back to the specific user account */
  sub: string
  /** RS-4: Timestamp when the refresh token expires */
  expiresAt: number
  /** RS-4: Allows for immediate revocation if the user logs out, changes a password, or a security event occurs */
  isRevoked: boolean
  /** RS-8: Hash of the previous refresh token for rotation tracking */
  previousTokenHash?: string
  /** RS-2, RS-3: Complete user object from the authentication provider including all profile data and provider-specific properties */
  user: Record<string, unknown>
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
 * @param user - The user object from the provider
 * @param tokens - The tokens from the provider
 * @returns Record of custom claims to add to the JWT
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomClaimsCallback<TUser = any, TTokens = any> = (
  user: TUser,
  tokens: TTokens
) => Record<string, string | number | boolean | Array<string | number | boolean> | null>
  | Promise<Record<string, string | number | boolean | Array<string | number | boolean> | null>>
