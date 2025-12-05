import type { CustomClaimsCallback, OnError, OnUserInfo, OnSuccess } from './index'

/**
 * OAuth provider configuration types
 * Defines configuration interfaces for all supported OAuth providers
 */

/**
 * Base OAuth provider configuration
 */
export interface OAuthProviderConfig {
  /** OAuth client ID from the provider */
  clientId: string
  /** OAuth client secret from the provider */
  clientSecret: string
  /** OAuth scopes to request from the provider */
  scopes?: string[]
  /** Authorization endpoint URL (override provider default) */
  authorizeUrl?: string
  /** Token endpoint URL (override provider default) */
  tokenUrl?: string
  /** User info endpoint URL (override provider default) */
  userInfoUrl?: string
  /** Redirect URI for OAuth callback (defaults to authPath + '/providers/[provider]') */
  redirectUri?: string
  /**
   * Custom query parameters to append to the authorization URL
   *
   * These parameters will be included when redirecting to the OAuth provider's authorization endpoint.
   * Custom parameters override default parameters, but critical OAuth parameters (client_id, redirect_uri,
   * code, grant_type) are protected and cannot be overridden for security reasons.
   *
   * @example
   * // Google-specific parameters
   * authorizationParams: {
   *   access_type: 'offline',    // Request refresh token
   *   prompt: 'consent',         // Force consent screen
   * }
   *
   * @example
   * // Auth0-specific parameters
   * authorizationParams: {
   *   prompt: 'login',           // Force login screen
   *   screen_hint: 'signup',     // Show signup page
   * }
   */
  authorizationParams?: Record<string, string>
}

/**
 * Google OAuth provider configuration
 */
export interface GoogleProviderConfig extends Partial<OAuthProviderConfig> {
  /** Google OAuth client ID */
  clientId: string
  /** Google OAuth client secret */
  clientSecret: string
  /** Google OAuth scopes (default: ['openid', 'profile', 'email']) */
  scopes?: string[]
}

/**
 * Microsoft OAuth provider configuration
 */
export interface MicrosoftProviderConfig extends Partial<OAuthProviderConfig> {
  /** Microsoft OAuth client ID */
  clientId: string
  /** Microsoft OAuth client secret */
  clientSecret: string
  /** Microsoft tenant ID or 'common', 'organizations', 'consumers' (default: 'common') */
  tenant?: string
  /** Microsoft OAuth scopes (default: ['openid', 'profile', 'email']) */
  scopes?: string[]
}

/**
 * GitHub OAuth provider configuration
 */
export interface GithubProviderConfig extends Partial<OAuthProviderConfig> {
  /** GitHub OAuth client ID */
  clientId: string
  /** GitHub OAuth client secret */
  clientSecret: string
  /** GitHub OAuth scopes (default: ['user:email']) */
  scopes?: string[]
}

/**
 * Auth0 OAuth provider configuration
 */
export interface Auth0ProviderConfig extends Partial<OAuthProviderConfig> {
  /** Auth0 OAuth client ID */
  clientId: string
  /** Auth0 OAuth client secret */
  clientSecret: string
  /** Auth0 domain (e.g., 'your-tenant.auth0.com' or 'your-tenant.us.auth0.com') */
  domain?: string
  /** Auth0 OAuth scopes (default: ['openid', 'profile', 'email']) */
  scopes?: string[]
}

/**
 * Password provider configuration
 */
export interface PasswordProviderConfig {
  /** Magic code time-to-live in seconds (default: 600 = 10 minutes) */
  magicCodeTTL?: number
  /** Maximum magic code verification attempts (default: 5) */
  magicCodeMaxAttempts?: number
  /** Password hashing rounds (default: 12) */
  passwordHashRounds?: number
  /** Password policy configuration */
  passwordPolicy?: {
    /** Minimum password length (default: 8) */
    minLength?: number
    /** Require uppercase letter (default: true) */
    requireUppercase?: boolean
    /** Require lowercase letter (default: true) */
    requireLowercase?: boolean
    /** Require number (default: true) */
    requireNumber?: boolean
    /** Require special character (default: false) */
    requireSpecial?: boolean
  }
}

/**
 * Password user interface
 */
export interface PasswordUser {
  /** User ID (optional) */
  id?: string
  /** User email */
  email: string
  /** Hashed password */
  hashedPassword: string
  /** Additional user properties */
  [key: string]: unknown
}

/**
 * Mock provider configuration (for testing)
 */
export interface MockProviderConfig extends Partial<OAuthProviderConfig> {
  /** Mock OAuth client ID (required, can be any string) */
  clientId: string
  /** Mock OAuth client secret (required, can be any string) */
  clientSecret: string
  /**
   * Mock user personas for testing different user scenarios
   * Each key is a user identifier, value contains user profile data
   * Required fields: sub (subject), email, name
   *
   * @example
   * mockUsers: {
   *   admin: {
   *     sub: 'mock-user-admin',
   *     email: 'admin@example.com',
   *     name: 'Admin User',
   *     role: 'admin',
   *   },
   *   user: {
   *     sub: 'mock-user-001',
   *     email: 'user@example.com',
   *     name: 'Regular User',
   *   },
   * }
   */
  mockUsers: Record<string, {
    /** Subject identifier (required) */
    sub: string
    /** User email (required) */
    email: string
    /** User display name (required) */
    name: string
    /** Additional custom claims */
    [key: string]: unknown
  }>
  /**
   * Default user to return when no ?user= parameter specified
   * Must match a key in mockUsers
   */
  defaultUser?: string
  /**
   * Allow mock provider in production (NOT RECOMMENDED)
   * Default: false
   * @deprecated For testing purposes only - never use in production
   */
  enableInProduction?: boolean
}

/**
 * Custom OAuth provider configuration
 */
export interface CustomProviderConfig extends OAuthProviderConfig {
  /** Unique name identifier for the custom provider */
  name: string
}

/**
 * OAuth configuration wrapper
 */
export interface OAuthConfig<TConfig> {
  config?: Partial<TConfig>
  onError?: OnError
  /**
   * Custom claims to add to the generated JWT
   * Can be a static object or a callback function that receives user and tokens
   */
  customClaims?: Record<string, string | number | boolean | Array<string | number | boolean> | null> | CustomClaimsCallback
  /**
   * User information transformation hook (provider-level)
   * Called after fetching user info from the provider, before storing it
   * Allows provider-specific user object shaping
   */
  onUserInfo?: OnUserInfo
  /**
   * Success hook (provider-level)
   * Called after successful authentication, before generating authorization CODE
   * Use for side effects like database storage
   */
  onSuccess?: OnSuccess
}
