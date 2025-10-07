import type { H3Error, H3Event } from 'h3'

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
 * Runtime config for Nuxt Aegis
 */
export interface NuxtAegisRuntimeConfig {
  session?: SessionConfig
  token?: TokenConfig
  tokenRefresh?: TokenRefreshConfig
  globalMiddleware?: boolean
  protectedRoutes?: string[]
  publicRoutes?: string[]
  authPath?: string
  google?: GoogleProviderConfig
  microsoft?: MicrosoftProviderConfig
  github?: GithubProviderConfig
}

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

// TODO:
/**
 * Custom OAuth provider configuration
 */
export interface CustomProviderConfig extends OAuthProviderConfig {
  /** Unique name identifier for the custom provider */
  name: string
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
 * Session cookie configuration
 */
export interface SessionConfig {
  /** Name of the session cookie (default: 'nuxt-aegis-session') */
  cookieName?: string
  /** Session cookie max age in seconds (default: 604800 - 7 days) */
  maxAge?: number
  /** Enable secure flag for cookies (default: true) */
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
  /** Time threshold in seconds before token expiry to trigger refresh (default: 300 - 5 minutes) */
  threshold?: number
  /** Automatically refresh tokens in the background (default: true) */
  automaticRefresh?: boolean
}

/**
 * Redirect URL configuration
 */
export interface RedirectConfig {
  /** Redirect URL for unauthenticated users (default: '/login') */
  login?: string
  /** Redirect URL after logout (default: '/') */
  logout?: string
  /** OAuth callback URL path (default: '/auth/callback') */
  callback?: string
  /** Home page URL after successful authentication (default: '/') */
  home?: string
}

/**
 * Nuxt Aegis module configuration options
 */
export interface ModuleOptions {
  /** Enable Nuxt DevTools integration (default: true) */
  devtools?: boolean

  /**
   * OAuth provider configurations
   * Configure one or more authentication providers
   */
  providers?: {
    /** Google OAuth provider configuration */
    google?: GoogleProviderConfig
    /** Microsoft OAuth provider configuration */
    microsoft?: MicrosoftProviderConfig
    /** GitHub OAuth provider configuration */
    github?: GithubProviderConfig
    /** Custom OAuth provider configurations */
    custom?: CustomProviderConfig[]
  }

  /** Session cookie configuration */
  session?: SessionConfig

  /** Token configuration */
  token?: TokenConfig

  /** Token refresh configuration */
  tokenRefresh?: TokenRefreshConfig

  /** Redirect URL configuration */
  redirect?: RedirectConfig

  /** Enable global authentication middleware for all routes (default: false) */
  globalMiddleware?: boolean

  /** Array of route patterns that require authentication (glob patterns supported) */
  protectedRoutes?: string[]

  /** Array of route patterns excluded from global authentication (glob patterns supported) */
  publicRoutes?: string[]

  /** Path for authentication API routes (default: '/auth') */
  authPath?: string

  /** Enable CSRF protection for authentication flows (default: true) */
  enableCSRFProtection?: boolean

  /** Enable OAuth state parameter validation (default: true) */
  enableStateValidation?: boolean

  /** Logging level for authentication operations (default: 'warn') */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug'
}

export type OnError = (event: H3Event, error: H3Error) => Promise<void> | void

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
) => Record<string, string | number | boolean | Array<string | number | boolean> | null> | Promise<Record<string, string | number | boolean | Array<string | number | boolean> | null>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OAuthConfig<TConfig, TResult = { user: any, tokens: any }> {
  config?: Partial<TConfig>
  onSuccess?: (
    event: H3Event,
    result: TResult
  ) => Promise<void> | void
  onError?: OnError
  /**
   * Custom claims to add to the generated JWT
   * Can be a static object or a callback function that receives user and tokens
   */
  customClaims?: Record<string, string | number | boolean | Array<string | number | boolean> | null> | CustomClaimsCallback
}

// Module augmentation for Nuxt runtime config
declare module '@nuxt/schema' {
  interface RuntimeConfig {
    nuxtAegis?: NuxtAegisRuntimeConfig
  }
}
