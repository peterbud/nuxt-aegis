import type {
  GoogleProviderConfig,
  MicrosoftProviderConfig,
  GithubProviderConfig,
  Auth0ProviderConfig,
  MockProviderConfig,
  CustomProviderConfig,
  PasswordProviderConfig,
} from './providers'
import type { TokenConfig, ClaimsValidationConfig } from './token'
import type { TokenRefreshConfig } from './refresh'
import type { ClientMiddlewareConfig } from './routes'
import type { AuthCodeConfig } from './authCode'

/**
 * Module and runtime configuration types
 */

/**
 * Redirect URL configuration
 */
export interface RedirectConfig {
  /** Redirect URL after logout (default: '/') */
  logout?: string
  /** Redirect URL after successful authentication (default: '/') */
  success?: string
  /** Redirect URL when authentication fails (default: '/') */
  error?: string
}

/**
 * API endpoint path configuration
 */
export interface EndpointConfig {
  /** Base path for authentication API routes (default: '/auth') */
  authPath?: string
  /** Base path for login endpoints without provider (default: '/auth'). Login URLs are constructed as '[loginPath]/[provider]' */
  loginPath?: string
  /** Path for callback endpoints (default: '/auth/callback') */
  callbackPath?: string
  /** Path for logout endpoint (default: '/auth/logout') */
  logoutPath?: string
  /** Path for token refresh endpoint (default: '/auth/refresh') */
  refreshPath?: string
  /** Path for user info endpoint (default: '/api/user/me') */
  userInfoPath?: string
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level: 'silent' | 'error' | 'warn' | 'info' | 'debug' (default: 'info') */
  level?: 'silent' | 'error' | 'warn' | 'info' | 'debug'
  /** Enable security event logging (default: false, enabled when level is 'debug') */
  security?: boolean
}

/**
 * Impersonation configuration
 */
export interface ImpersonationConfig {
  /** Enable user impersonation feature (default: false, opt-in for security) */
  enabled?: boolean
  /** Token expiration time for impersonated sessions in seconds (default: 900 = 15 minutes) */
  tokenExpiration?: number
}

/**
 * Runtime config for Nuxt Aegis
 */
export interface NuxtAegisRuntimeConfig {
  token?: TokenConfig
  tokenRefresh?: TokenRefreshConfig
  authCode?: AuthCodeConfig
  endpoints?: EndpointConfig
  authPath?: string
  logging?: LoggingConfig
  impersonation?: ImpersonationConfig
  providers?: {
    google?: GoogleProviderConfig
    microsoft?: MicrosoftProviderConfig
    github?: GithubProviderConfig
    auth0?: Auth0ProviderConfig
    mock?: MockProviderConfig
    password?: PasswordProviderConfig
  }
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
    /** Auth0 OAuth provider configuration */
    auth0?: Auth0ProviderConfig
    /** Mock OAuth provider configuration (development/testing only) */
    mock?: MockProviderConfig
    /** Password provider configuration */
    password?: PasswordProviderConfig
    /** Custom OAuth provider configurations */
    custom?: CustomProviderConfig[]
  }

  /** Token configuration */
  token?: TokenConfig

  /** Token refresh configuration */
  tokenRefresh?: TokenRefreshConfig

  /**
   * Authorization code configuration (CODE-based flow)
   * Default: 60 seconds (recommended for security)
   */
  authCode?: AuthCodeConfig

  /** Redirect URL configuration */
  redirect?: RedirectConfig

  /** Client-side middleware configuration for route protection */
  clientMiddleware?: ClientMiddlewareConfig

  /** Claims validation configuration */
  claimsValidation?: ClaimsValidationConfig

  /** API endpoint path configuration */
  endpoints?: EndpointConfig

  /** Logging configuration */
  logging?: LoggingConfig

  /** Impersonation configuration (opt-in feature) */
  impersonation?: ImpersonationConfig

  /**
   * Enable SSR-compatible authentication state restoration
   * When true (default), authentication state will be restored on client after SSR hydration
   * When false, plugin skips execution after server-side rendering (backward compatibility)
   * @default true
   */
  enableSSR?: boolean
}
