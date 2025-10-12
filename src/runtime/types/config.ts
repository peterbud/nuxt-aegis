import type {
  GoogleProviderConfig,
  MicrosoftProviderConfig,
  GithubProviderConfig,
  Auth0ProviderConfig,
  CustomProviderConfig,
} from './providers'
import type { TokenConfig, ClaimsValidationConfig } from './token'
import type { TokenRefreshConfig } from './refresh'
import type { RouteProtectionConfig } from './routes'

/**
 * Module and runtime configuration types
 */

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
 * Runtime config for Nuxt Aegis
 */
export interface NuxtAegisRuntimeConfig {
  token?: TokenConfig
  tokenRefresh?: TokenRefreshConfig
  routeProtection?: RouteProtectionConfig
  endpoints?: EndpointConfig
  authPath?: string
  providers?: {
    google?: GoogleProviderConfig
    microsoft?: MicrosoftProviderConfig
    github?: GithubProviderConfig
    auth0?: Auth0ProviderConfig
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
