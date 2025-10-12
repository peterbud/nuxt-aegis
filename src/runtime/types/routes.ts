/**
 * Route protection configuration types
 */

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
