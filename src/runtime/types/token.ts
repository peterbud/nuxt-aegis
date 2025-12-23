/**
 * Token-related type definitions
 * Handles JWT tokens, payloads, and token validation
 */

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
 * Base JWT token claims interface
 *
 * Defines the standard JWT claims that are always present in tokens.
 * This serves as the foundation for CustomTokenClaims, which extends these
 * base claims with your application-specific custom claims.
 *
 * Use CustomTokenClaims<T> to add your own claims on top of these base claims.
 * This is what gets stored in the JWT and attached to event.context.user.
 */
export interface BaseTokenClaims {
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
  /** Resolved custom claims from initial authentication - reused during token refresh to maintain consistency */
  customClaims?: Record<string, unknown>
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
 * JSON-compatible value type for JWT custom claims
 * Supports primitives, arrays, and one level of object nesting
 */
export type JSONValue = | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | { [key: string]: string | number | boolean | null | undefined | string[] | number[] }

/**
 * Helper type for creating custom token payloads with type safety
 *
 * Combines BaseTokenClaims (standard JWT claims like sub, email, name) with your
 * application-specific custom claims. This is the primary type you'll use when
 * working with authenticated users in your application.
 *
 * The relationship:
 * - BaseTokenClaims: Standard JWT claims (sub, email, name, iss, exp, etc.)
 * - CustomTokenClaims<T>: BaseTokenClaims + your custom claims (role, permissions, etc.)
 *
 * Ensures type safety by preventing override of standard JWT claims and ensuring
 * all custom claims are JSON-serializable.
 *
 * @template T - Record of custom claims to add to the base token claims
 *
 * @example
 * ```typescript
 * // Define your custom claims on top of base claims
 * type AppTokenClaims = CustomTokenClaims<{
 *   role: string
 *   permissions: string[]
 *   organizationId: string
 * }>
 *
 * // Use with useAuth - you get both base claims (sub, email, name)
 * // and your custom claims (role, permissions, organizationId)
 * const { user } = useAuth<AppTokenClaims>()
 * console.log(user.value?.email) // Base claim
 * console.log(user.value?.role) // Custom claim - Type-safe access
 * ```
 *
 * @example
 * ```typescript
 * // With nested objects (one level)
 * type AppTokenClaims = CustomTokenClaims<{
 *   role: string
 *   metadata: {
 *     tenantId: string
 *     plan: string
 *   }
 * }>
 * ```
 *
 * @warning Never include sensitive data like passwords, API keys, or secrets in JWT tokens
 * @warning Keep token payloads small (< 1KB recommended) for performance
 */
export type CustomTokenClaims<T extends Record<string, JSONValue>> = BaseTokenClaims & T

/**
 * Utility type to extract only custom claims from a token payload
 *
 * Removes all standard BaseTokenClaims fields, leaving only your custom claims.
 * Useful for type composition and claim validation.
 *
 * @template T - A token payload type extending BaseTokenClaims
 *
 * @example
 * ```typescript
 * type AppTokenClaims = CustomTokenClaims<{
 *   role: string
 *   permissions: string[]
 * }>
 *
 * type CustomClaims = ExtractClaims<AppTokenClaims>
 * // Result: { role: string, permissions: string[] }
 * ```
 */
export type ExtractClaims<T extends BaseTokenClaims> = Omit<T, keyof BaseTokenClaims>

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
  tokens: TTokens,
) => Record<string, string | number | boolean | Array<string | number | boolean> | null>
  | Promise<Record<string, string | number | boolean | Array<string | number | boolean> | null>>
