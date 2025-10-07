import {
  defineNuxtModule,
  addImports,
  addPlugin,
  addServerHandler,
  addServerImportsDir,
  createResolver,
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
    session: {
      cookieName: 'nuxt-aegis-session',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
    },
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
    },
    redirect: {
      login: '/login',
      logout: '/',
      callback: '/auth/callback',
      home: '/',
    },
    globalMiddleware: false,
    protectedRoutes: [],
    publicRoutes: [],
    authPath: '/auth',
    enableCSRFProtection: true,
    enableStateValidation: true,
    logLevel: 'warn',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    addPlugin(resolver.resolve('./runtime/plugin'))

    // Client imports
    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/app/composables/useAuth'),
      },
    ])

    // Server imports
    addServerImportsDir(resolver.resolve('./runtime/server/providers'))
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    // server handlers
    addServerHandler({
      route: `/api/user/me`,
      handler: resolver.resolve('./runtime/server/routes/me.get'),
      method: 'get',
    })

    addServerHandler({
      route: `/api/user/logout`,
      handler: resolver.resolve('./runtime/server/routes/logout.post'),
      method: 'post',
    })

    // middleware
    addServerHandler ({
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
      session: defu(runtimeConfig.nuxtAegis.session, options.session),
      token: defu(runtimeConfig.nuxtAegis.token, options.token),
      tokenRefresh: defu(runtimeConfig.nuxtAegis.tokenRefresh, options.tokenRefresh),
      globalMiddleware: options.globalMiddleware,
      protectedRoutes: options.protectedRoutes,
      publicRoutes: options.publicRoutes,
      authPath: options.authPath,
    }

    runtimeConfig.nuxtAegis.google = defu(runtimeConfig.nuxtAegis.google, {
      clientId: options.providers?.google?.clientId || '',
      clientSecret: options.providers?.google?.clientSecret || '',
    })
  },
})
