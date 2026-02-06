/**
 * Route protection configuration types
 */

/**
 * Authentication requirement for Nitro route rules
 * - true | 'required' | 'protected': Route requires authentication
 * - false | 'public' | 'skip': Route is public and skips authentication
 */
export type NitroAegisAuth = boolean | 'required' | 'protected' | 'public' | 'skip'

/**
 * Nuxt Aegis route rules configuration
 */
export interface NuxtAegisRouteRules {
  auth?: NitroAegisAuth
}

/**
 * Client-side middleware configuration for route protection
 */
export interface ClientMiddlewareConfig {
  /** Enable client-side route protection middleware (default: false) */
  enabled: boolean
  /** Register middleware globally for all routes (default: false) */
  global?: boolean
  /** Redirect destination for unauthenticated users (required when enabled) */
  redirectTo: string
  /** Redirect destination for authenticated users on logged-out pages */
  loggedOutRedirectTo?: string
  /** Array of route patterns excluded from authentication (glob patterns supported) */
  publicRoutes?: string[]
}
