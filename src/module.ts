import {
  defineNuxtModule,
  addImports,
  addPlugin,
  addServerHandler,
  addServerImportsDir,
  createResolver,
  extendPages,
  logger,
} from '@nuxt/kit'
import type { ModuleOptions } from './runtime/types'
import { defu } from 'defu'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-aegis',
    configKey: 'nuxtAegis',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    devtools: true,
    token: {
      secret: '', // Must be provided by user or generated
      expiresIn: '1h', // Access token expiry
      algorithm: 'HS256',
      issuer: 'nuxt-aegis',
      audience: '',
    },
    tokenRefresh: {
      enabled: true,
      threshold: 300, // 5 minutes before expiry
      automaticRefresh: true,
      cookie: {
        cookieName: 'nuxt-aegis-refresh',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
        path: '/',
      },
    },
    redirect: {
      login: '/',
      logout: '/',
    },
    routeProtection: {
      protectedRoutes: [],
      publicRoutes: [],
    },
    endpoints: {
      authPath: '/auth',
    },
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // CF-4: Validate configuration
    if (!options.token?.secret && !process.env.NUXT_AEGIS_TOKEN_SECRET) {
      logger.warn('[Nuxt Aegis] Warning: No token secret configured. Authentication will not work properly.')
    }

    addPlugin(resolver.resolve('./runtime/app/plugins/api.client'))

    // CL-1: Client imports - useAuth composable
    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/app/composables/useAuth'),
      },
      {
        name: 'useAPI',
        from: resolver.resolve('./runtime/app/composables/useAPI'),
      },
    ])

    extendPages((pages) => {
      pages.push({
        name: 'Callback',
        path: '/auth/callback',
        file: resolver.resolve('./runtime/app/pages/AuthCallback.vue'),
      })
    })

    // Server imports
    addServerImportsDir(resolver.resolve('./runtime/server/providers'))
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    // EP-15, EP-16, EP-17, EP-18: User info endpoint
    addServerHandler({
      route: `/api/user/me`,
      handler: resolver.resolve('./runtime/server/routes/me.get'),
      method: 'get',
    })

    // EP-11, EP-12, EP-13: Logout endpoint
    addServerHandler({
      route: `/api/user/logout`,
      handler: resolver.resolve('./runtime/server/routes/logout.post'),
      method: 'post',
    })

    // Add legacy logout route for backward compatibility
    addServerHandler({
      route: `/auth/logout`,
      handler: resolver.resolve('./runtime/server/routes/logout.post'),
      method: 'post',
    })

    // EP-19, EP-20, EP-21: Token refresh endpoint
    addServerHandler({
      route: `/auth/refresh`,
      handler: resolver.resolve('./runtime/server/routes/refresh.post'),
      method: 'post',
    })

    // MW-1: Authentication middleware
    addServerHandler({
      handler: resolver.resolve('./runtime/server/middleware/auth'),
      middleware: true,
    })

    // Runtime Config
    const runtimeConfig = nuxt.options.runtimeConfig
    if (!runtimeConfig.nuxtAegis) {
      runtimeConfig.nuxtAegis = {}
    }

    runtimeConfig.nuxtAegis = {
      ...runtimeConfig.nuxtAegis,
      token: defu(runtimeConfig.nuxtAegis.token, options.token),
      tokenRefresh: defu(runtimeConfig.nuxtAegis.tokenRefresh, options.tokenRefresh),
      routeProtection: options.routeProtection,
      endpoints: options.endpoints,
      authPath: options.endpoints?.authPath,
    }

    runtimeConfig.nuxtAegis.google = defu(runtimeConfig.nuxtAegis.google, {
      clientId: options.providers?.google?.clientId || '',
      clientSecret: options.providers?.google?.clientSecret || '',
    })
  },
})
