import type { NuxtAegisRuntimeConfig, RedirectConfig, LoggingConfig } from './config'
import type { TokenRefreshConfig } from './refresh'
import type { TokenPayload } from './token'
import type { RouteProtectionConfig } from './routes'
import type { SuccessHookPayload } from './hooks'

/**
 * Module augmentations for external libraries
 */

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    nuxtAegis?: NuxtAegisRuntimeConfig
  }

  interface PublicRuntimeConfig {
    nuxtAegis: {
      authPath: string
      callbackPath: string
      redirect: RedirectConfig
      tokenRefresh: TokenRefreshConfig
      routeProtection: RouteProtectionConfig
      logging: LoggingConfig
    }
  }
}

declare module 'nitropack' {
  interface NitroRuntimeHooks {
    /**
     * Hook called after successful authentication.
     * Use this for logging, analytics, or database operations.
     */
    'nuxt-aegis:success': (payload: SuccessHookPayload) => Promise<void> | void
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

declare module '#app' {
  interface NuxtApp {
    /**
     * Custom $fetch instance with automatic bearer token injection
     * Configured by the Nuxt Aegis plugin
     */
    $api: typeof $fetch
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    /**
     * Custom $fetch instance with automatic bearer token injection
     * Configured by the Nuxt Aegis plugin
     */
    $api: typeof $fetch
  }
}
