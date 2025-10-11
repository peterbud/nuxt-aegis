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
 * Refresh token stored data interface
 * Represents the data stored alongside a refresh token
 * on the server side for validation and management
 */
export interface RefreshTokenData {
  /** the subject, links the token back to the specific user account.  */
  sub: string
  /** Timestamp when the refresh token expires */
  expiresAt: number
  /**
   * Allows for immediate revocation if the user logs out, changes a password,
   * or a security event occurs
   */
  isRevoked: boolean
  /** Timestamp when the refresh token was issued */
  previousTokenHash?: string
}

export interface RefreshResponse {
  success: boolean
  message: string
  accessToken?: string
}

/**
 * Runtime config for Nuxt Aegis
 */
export interface NuxtAegisRuntimeConfig {
  token?: TokenConfig
  tokenRefresh?: TokenRefreshConfig
  routeProtection?: RouteProtectionConfig
  endpoints?: EndpointConfig
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

/**
 * Redirect URL configuration
 */
export interface RedirectConfig {
  /** Redirect URL for unauthenticated users (default: '/') */
  login?: string
  /** Redirect URL after logout (default: '/') */
  logout?: string
  /** Redirect URL after successful authentication (default: '/') */
  success?: string
  /** Redirect URL when authentication fails (default: '/auth/error') */
  error?: string
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
 * Route protection configuration
 */
export interface RouteProtectionConfig {
  /** Array of route patterns that require authentication (glob patterns supported) */
  protectedRoutes?: string[]
  /** Array of route patterns excluded from global authentication (glob patterns supported) */
  publicRoutes?: string[]
  /** TODO: Strategy when route matches both protected and public patterns ('public' | 'protected', default: 'public') */
  // conflictStrategy?: 'public' | 'protected'
}

/**
 * API endpoint path configuration
 */
export interface EndpointConfig {
  /** Base path for authentication API routes (default: '/auth') */
  authPath?: string
  /** Path for login endpoints (default: '[authPath]/[provider]') */
  loginPath?: string
  /** Path for callback endpoints (default: '[authPath]/callback') */
  callbackPath?: string
  /** Path for logout endpoint (default: '[authPath]/logout') */
  logoutPath?: string
  /** Path for token refresh endpoint (default: '[authPath]/refresh') */
  refreshPath?: string
  /** Path for user info endpoint (default: '/api/user/me') */
  userInfoPath?: string
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

  /** Token configuration */
  token?: TokenConfig

  /** Token refresh configuration */
  tokenRefresh?: TokenRefreshConfig

  /** Redirect URL configuration */
  redirect?: RedirectConfig

  /** Route protection configuration */
  routeProtection?: RouteProtectionConfig

  /** Claims validation configuration */
  claimsValidation?: ClaimsValidationConfig

  /** API endpoint path configuration */
  endpoints?: EndpointConfig
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

export interface OAuthConfig<TConfig> {
  config?: Partial<TConfig>
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

  interface PublicRuntimeConfig {
    nuxtAegis: {
      authPath: string
      redirect: RedirectConfig
      tokenRefresh: TokenRefreshConfig
    }
  }
}

declare module 'h3' {
  interface H3EventContext {
    /**
     * Authenticated user data from JWT token
     * Available when request is authenticated via the auth middleware
     */
    user?: TokenPayload
  }
}
