import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerImportsDir,
  createResolver,
  defineNuxtModule,
  extendPages,
  logger,
  updateRuntimeConfig,
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
      callbackPath: '/auth/callback',
    },
  },
  setup(options, nuxt) {
    // Runtime Config
    updateRuntimeConfig({
      public: {
        nuxtAegis: {
          authPath: options.endpoints?.authPath || '/auth',
          redirect: options.redirect,
          tokenRefresh: options.tokenRefresh,
        },
      },
      nuxtAegis: options,
    })

    const runtimeConfig = nuxt.options.runtimeConfig

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
    ])

    extendPages((pages) => {
      pages.push({
        name: 'Callback',
        path: `${runtimeConfig.nuxtAegis?.endpoints?.callbackPath}` || `${runtimeConfig.public.nuxtAegis.authPath}/callback`,
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
      route: `${runtimeConfig.public.nuxtAegis.authPath}/logout`,
      handler: resolver.resolve('./runtime/server/routes/logout.post'),
      method: 'post',
    })

    // EP-19, EP-20, EP-21: Token refresh endpoint
    addServerHandler({
      route: `${runtimeConfig.public.nuxtAegis.authPath}/refresh`,
      handler: resolver.resolve('./runtime/server/routes/refresh.post'),
      method: 'post',
    })

    // MW-1: Authentication middleware
    addServerHandler({
      handler: resolver.resolve('./runtime/server/middleware/auth'),
      middleware: true,
    })

    // extend nuxt config with nitro storage for refresh tokens
    // Ensure the nitro configuration object exists
    if (!nuxt.options.nitro) {
      nuxt.options.nitro = {}
    }

    // Ensure the storage configuration object exists within nitro
    if (!nuxt.options.nitro.storage) {
      nuxt.options.nitro.storage = {}
    }

    // Add default storage configuration
    nuxt.options.nitro.storage.refreshTokenStore = defu(nuxt.options.nitro.storage.refreshTokenStore, {
      driver: 'fs',
      base: './.data/refresh-tokens',
    })

    // Add a routerOption for the AuthCallback page
    // to prevent Vue Router warnings about invalid hash
    nuxt.hook('pages:routerOptions', (routerOptions) => {
      routerOptions.files.push({
        path: resolver.resolve('./runtime/app/router.options.ts'),
      })
    })
  },
})
