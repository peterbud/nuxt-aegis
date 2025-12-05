import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerImports,
  addServerImportsDir,
  createResolver,
  defineNuxtModule,
  extendPages,
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
      encryption: {
        enabled: false, // SC-16: Encryption disabled by default
        algorithm: 'aes-256-gcm', // SC-17: Default encryption algorithm
      },
      storage: {
        driver: 'fs', // RS-10: Default to filesystem storage
        prefix: 'refresh:', // Default key prefix
        base: './.data/refresh-tokens', // Default filesystem path
      },
    },
    authCode: {
      expiresIn: 60, // CS-4, CF-9: Authorization code expiry in seconds (default 60s)
    },
    redirect: {
      logout: '/',
      success: '/',
      error: '/',
    },
    routeProtection: {
      protectedRoutes: [],
      publicRoutes: [],
    },
    endpoints: {
      authPath: '/auth',
      loginPath: '/auth',
      callbackPath: '/auth/callback',
      logoutPath: '/auth/logout',
      refreshPath: '/auth/refresh',
      userInfoPath: '/api/user/me',
    },
    logging: {
      level: 'info',
      security: false,
    },
  },
  setup(options, nuxt) {
    // Runtime Config
    updateRuntimeConfig({
      public: {
        nuxtAegis: {
          authPath: options.endpoints?.authPath || '/auth',
          loginPath: options.endpoints?.loginPath || options.endpoints?.authPath || '/auth',
          callbackPath: options.endpoints?.callbackPath || '/auth/callback',
          logoutPath: options.endpoints?.logoutPath || '/auth/logout',
          refreshPath: options.endpoints?.refreshPath || '/auth/refresh',
          userInfoPath: options.endpoints?.userInfoPath || '/api/user/me',
          redirect: options.redirect,
          tokenRefresh: options.tokenRefresh,
          routeProtection: options.routeProtection,
          logging: options.logging,
        },
      },
      nuxtAegis: options,
    })

    const runtimeConfig = nuxt.options.runtimeConfig

    const resolver = createResolver(import.meta.url)

    // SC-19: Validate encryption configuration
    if (options.tokenRefresh?.encryption?.enabled) {
      const encryptionKey = options.tokenRefresh.encryption.key || process.env.NUXT_AEGIS_ENCRYPTION_KEY

      if (!encryptionKey) {
        throw new Error(
          '[Nuxt Aegis] Encryption is enabled but no encryption key is configured. '
          + 'Please set tokenRefresh.encryption.key in nuxt.config.ts or NUXT_AEGIS_ENCRYPTION_KEY environment variable.',
        )
      }

      // Store encryption key in runtime config for server access
      if (!runtimeConfig.nuxtAegis) {
        runtimeConfig.nuxtAegis = {}
      }
      if (!runtimeConfig.nuxtAegis.tokenRefresh) {
        runtimeConfig.nuxtAegis.tokenRefresh = {}
      }
      if (!runtimeConfig.nuxtAegis.tokenRefresh.encryption) {
        runtimeConfig.nuxtAegis.tokenRefresh.encryption = {}
      }
      runtimeConfig.nuxtAegis.tokenRefresh.encryption.key = encryptionKey
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

    // Server imports - providers are all public
    addServerImportsDir(resolver.resolve('./runtime/server/providers'))

    // Server imports - only expose public API utilities
    addServerImports([
      // Authentication utilities (from auth.ts)
      { name: 'requireAuth', from: resolver.resolve('./runtime/server/utils/auth') },
      { name: 'getAuthUser', from: resolver.resolve('./runtime/server/utils/auth') },
      { name: 'generateAccessToken', from: resolver.resolve('./runtime/server/utils/auth') },
      { name: 'verifyToken', from: resolver.resolve('./runtime/server/utils/auth') },
      { name: 'generateAuthTokens', from: resolver.resolve('./runtime/server/utils/auth') },

      // Refresh token management utilities (from refreshToken.ts)
      { name: 'revokeRefreshToken', from: resolver.resolve('./runtime/server/utils/refreshToken') },
      { name: 'deleteUserRefreshTokens', from: resolver.resolve('./runtime/server/utils/refreshToken') },
      { name: 'hashRefreshToken', from: resolver.resolve('./runtime/server/utils/refreshToken') },

      // Cookie utilities (from cookies.ts)
      { name: 'setRefreshTokenCookie', from: resolver.resolve('./runtime/server/utils/cookies') },
      { name: 'getRefreshTokenFromCookie', from: resolver.resolve('./runtime/server/utils/cookies') },

      // Custom claims utilities (from customClaims.ts)
      { name: 'applyCustomClaims', from: resolver.resolve('./runtime/server/utils/customClaims') },

      // Handler utilities (from handler.ts)
      { name: 'defineAegisHandler', from: resolver.resolve('./runtime/server/utils/handler') },
      { name: 'useAegisHandler', from: resolver.resolve('./runtime/server/utils/handler') },
    ])

    // EP-15, EP-16, EP-17, EP-18: User info endpoint
    addServerHandler({
      route: runtimeConfig.public.nuxtAegis.userInfoPath,
      handler: resolver.resolve('./runtime/server/routes/me.get'),
      method: 'get',
    })

    // EP-11, EP-12, EP-13: Logout endpoint

    addServerHandler({
      route: runtimeConfig.public.nuxtAegis.logoutPath,
      handler: resolver.resolve('./runtime/server/routes/logout.post'),
      method: 'post',
    })

    // EP-10, EP-11, EP-12, EP-13, EP-14, EP-15, EP-16, EP-17, EP-18: Token exchange endpoint
    // Exchanges authorization CODE for JWT access token and refresh token
    // CL-22: Called by AuthCallback.vue to complete CODE-based authentication flow
    addServerHandler({
      route: `${runtimeConfig.public.nuxtAegis.authPath}/token`,
      handler: resolver.resolve('./runtime/server/routes/token.post'),
      method: 'post',
    })

    // EP-19, EP-20, EP-21: Token refresh endpoint
    addServerHandler({
      route: runtimeConfig.public.nuxtAegis.refreshPath,
      handler: resolver.resolve('./runtime/server/routes/refresh.post'),
      method: 'post',
    })

    // Impersonation endpoints (if enabled)
    if (options.impersonation?.enabled) {
      addServerHandler({
        route: `${runtimeConfig.public.nuxtAegis.authPath}/impersonate`,
        handler: resolver.resolve('./runtime/server/routes/impersonate.post'),
        method: 'post',
      })

      addServerHandler({
        route: `${runtimeConfig.public.nuxtAegis.authPath}/unimpersonate`,
        handler: resolver.resolve('./runtime/server/routes/unimpersonate.post'),
        method: 'post',
      })
    }

    // Password provider endpoints
    if (options.providers?.password) {
      const passwordRoutes = [
        { path: 'password/register', file: 'register.post', method: 'post' as const },
        { path: 'password/register-verify', file: 'register-verify.get', method: 'get' as const },
        { path: 'password/login', file: 'login.post', method: 'post' as const },
        { path: 'password/login-verify', file: 'login-verify.get', method: 'get' as const },
        { path: 'password/reset-request', file: 'reset-request.post', method: 'post' as const },
        { path: 'password/reset-verify', file: 'reset-verify.get', method: 'get' as const },
        { path: 'password/reset-complete', file: 'reset-complete.post', method: 'post' as const },
        { path: 'password/change', file: 'change.post', method: 'post' as const },
      ]

      for (const route of passwordRoutes) {
        addServerHandler({
          route: `${runtimeConfig.public.nuxtAegis.authPath}/${route.path}`,
          handler: resolver.resolve(`./runtime/server/routes/password/${route.file}`),
          method: route.method,
        })
      }
    }

    // MW-1: Authentication middleware
    addServerHandler({
      handler: resolver.resolve('./runtime/server/middleware/auth'),
      middleware: true,
    })

    // MOCK PROVIDER: Register mock OAuth server routes (development/test only)
    // Only available when NODE_ENV !== 'production'
    const isProduction = process.env.NODE_ENV === 'production'

    if (!isProduction) {
      const mockConfig = options.providers?.mock

      if (mockConfig) {
        // Mock OAuth authorize endpoint
        addServerHandler({
          route: `${runtimeConfig.public.nuxtAegis.authPath}/mock/authorize`,
          handler: resolver.resolve('./runtime/server/routes/mock/authorize.get'),
          method: 'get',
        })

        // Mock OAuth token exchange endpoint
        addServerHandler({
          route: `${runtimeConfig.public.nuxtAegis.authPath}/mock/token`,
          handler: resolver.resolve('./runtime/server/routes/mock/token.post'),
          method: 'post',
        })

        // Mock OAuth userinfo endpoint
        addServerHandler({
          route: `${runtimeConfig.public.nuxtAegis.authPath}/mock/userinfo`,
          handler: resolver.resolve('./runtime/server/routes/mock/userinfo.get'),
          method: 'get',
        })
      }
    }

    // extend nuxt config with nitro storage for refresh tokens
    // Ensure the nitro configuration object exists
    if (!nuxt.options.nitro) {
      nuxt.options.nitro = {}
    }

    // Enable experimental tasks feature for cleanup tasks
    if (!nuxt.options.nitro.experimental) {
      nuxt.options.nitro.experimental = {}
    }
    nuxt.options.nitro.experimental.tasks = true

    // Configure Nitro to include tasks from the module
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.scanDirs = nitroConfig.scanDirs || []
      nitroConfig.scanDirs.push(resolver.resolve('./runtime'))
    })

    // Configure scheduled cleanup tasks
    // Run cleanup tasks daily at 2:00 AM
    if (!nuxt.options.nitro.scheduledTasks) {
      nuxt.options.nitro.scheduledTasks = {}
    }
    // 0 2 * * *
    nuxt.options.nitro.scheduledTasks['*/5 * * * *'] = [
      'cleanup:refresh-tokens',
      'cleanup:magic-codes',
      'cleanup:reset-sessions',
    ]

    // Ensure the storage configuration object exists within nitro
    if (!nuxt.options.nitro.storage) {
      nuxt.options.nitro.storage = {}
    }

    // RS-10: Add persistent storage configuration for refresh tokens
    const storageConfig = options.tokenRefresh?.storage || {}
    nuxt.options.nitro.storage.refreshTokenStore = defu(nuxt.options.nitro.storage.refreshTokenStore, {
      driver: storageConfig.driver || 'fs',
      base: storageConfig.base || './.data/refresh-tokens',
    })

    // CS-1, CS-4, PF-3: Add storage configuration for authorization codes
    // Use memory driver for short-lived codes (60s default, better performance, O(1) lookup)
    // PR-11: Server-side in-memory key-value store for temporary CODE storage
    nuxt.options.nitro.storage.authCodeStore = defu(nuxt.options.nitro.storage.authCodeStore, {
      driver: 'memory',
    })

    // Magic code storage (memory)
    nuxt.options.nitro.storage.magicCodeStore = defu(nuxt.options.nitro.storage.magicCodeStore, {
      driver: 'memory',
    })

    // Reset session storage (memory)
    nuxt.options.nitro.storage.resetSessionStore = defu(nuxt.options.nitro.storage.resetSessionStore, {
      driver: 'memory',
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
