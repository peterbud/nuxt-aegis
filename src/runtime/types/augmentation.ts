import type { NuxtAegisRuntimeConfig, RedirectConfig } from './config'
import type { TokenRefreshConfig } from './refresh'
import type { TokenPayload } from './token'

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
