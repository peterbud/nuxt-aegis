import {
  addImports,
  addPlugin,
  addRouteMiddleware,
  addServerHandler,
  addServerImports,
  addServerImportsDir,
  addServerPlugin,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  extendPages,
  updateRuntimeConfig,
  useLogger,
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
      rotationEnabled: true, // Enable refresh token rotation by default for security
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
        prefix: 'refresh:',
        base: './.data/refresh-tokens',
      },
      ssrTokenExpiry: '5m', // SSR token expiry (short-lived)
    },
    authCode: {
      expiresIn: 60, // CS-4, CF-9: Authorization code expiry in seconds (default 60s)
    },
    redirect: {
      logout: '/',
      success: '/',
      error: '/',
    },
    clientMiddleware: {
      enabled: false,
      global: false,
      redirectTo: '/login',
      loggedOutRedirectTo: '/',
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
    options.enableSSR = options.enableSSR ?? (nuxt.options.ssr === true ? true : false)
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
          clientMiddleware: options.clientMiddleware,
          logging: options.logging,
          enableSSR: options.enableSSR,
        },
      },
      nuxtAegis: options,
    })

    const runtimeConfig = nuxt.options.runtimeConfig

    // Get logger for validation warnings/errors
    const logger = useLogger('nuxt-aegis')

    // Validate SSR configuration
    if (options.enableSSR && nuxt.options.ssr === false) {
      logger.warn(
        'nuxtAegis.enableSSR is true but Nuxt SSR is disabled. '
        + 'SSR authentication will not work. Set ssr: true in nuxt.config.ts or disable enableSSR.',
      )
    }

    const resolver = createResolver(import.meta.url)

    // SC-19: Validate encryption configuration
    if (options.tokenRefresh?.encryption?.enabled) {
      const encryptionKey = options.tokenRefresh.encryption.key

      if (!encryptionKey && nuxt.options._prepare !== true) {
        // Warn during build time, but don't throw - validation happens at runtime
        logger.warn(
          '[Nuxt Aegis] Encryption is enabled but no encryption key is configured. '
          + 'The application will fail at runtime if encryption is attempted. '
          + 'Please set tokenRefresh.encryption.key in nuxt.config.ts or in the appropriate environment variable.',
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
      { name: 'verifyToken', from: resolver.resolve('./runtime/server/utils/auth') },
      { name: 'generateAuthTokens', from: resolver.resolve('./runtime/server/utils/auth') },

      // Refresh token management utilities (from refreshToken.ts)
      { name: 'revokeRefreshToken', from: resolver.resolve('./runtime/server/utils/refreshToken') },
      { name: 'deleteUserRefreshTokens', from: resolver.resolve('./runtime/server/utils/refreshToken') },
      { name: 'hashRefreshToken', from: resolver.resolve('./runtime/server/utils/refreshToken') },

      // Claims recomputation utilities (from recomputeClaims.ts)
      { name: 'recomputeCustomClaims', from: resolver.resolve('./runtime/server/utils/recomputeClaims') },

      // Cookie utilities (from cookies.ts)
      { name: 'setRefreshTokenCookie', from: resolver.resolve('./runtime/server/utils/cookies') },

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

    // Claims update endpoint
    addServerHandler({
      route: `${runtimeConfig.public.nuxtAegis.authPath}/update-claims`,
      handler: resolver.resolve('./runtime/server/routes/update-claims.post'),
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

    // Register Nitro server and app plugins for SSR authentication (if enabled)
    if (options.enableSSR) {
      addServerPlugin(resolver.resolve('./runtime/server/plugins/ssr-auth'))
      addPlugin(resolver.resolve('./runtime/app/plugins/api.server'))
      addPlugin(resolver.resolve('./runtime/app/plugins/ssr-state.server'))
    }

    // Register client-side route middlewares if enabled
    if (options.clientMiddleware?.enabled) {
      const cm = options.clientMiddleware

      // Validate and normalize configuration
      if (cm.global) {
        // CL-28: When global protection is enabled, ensure publicRoutes is configured
        const userPublicRoutes = cm.publicRoutes || []

        // CL-29: Automatically include redirect destinations in publicRoutes to prevent loops
        const redirectRoutes = [cm.redirectTo, cm.loggedOutRedirectTo]
        const allPublicRoutes = [...new Set([...userPublicRoutes, ...redirectRoutes])]

        // Update the config with normalized publicRoutes
        options.clientMiddleware.publicRoutes = allPublicRoutes

        // CL-28: Throw error if no public routes are configured (even after auto-inclusion)
        if (allPublicRoutes.length === 0) {
          throw new Error(
            '[nuxt-aegis] clientMiddleware.global is enabled but no publicRoutes are configured. '
            + 'At minimum, the redirectTo and loggedOutRedirectTo routes will be automatically included.',
          )
        }
      }
      else {
        // CL-32: Warn if publicRoutes is configured but will be ignored
        const userPublicRoutes = cm.publicRoutes || []
        if (userPublicRoutes.length > 0) {
          logger.warn(
            '[nuxt-aegis] clientMiddleware.publicRoutes is configured but will be ignored '
            + 'because clientMiddleware.global is false. The auth-logged-in middleware will only run '
            + 'on pages where you explicitly add it via definePageMeta({ middleware: [\'auth-logged-in\'] }).',
          )
        }
      }

      // Register auth-logged-in middleware
      addRouteMiddleware({
        name: 'auth-logged-in',
        path: resolver.resolve('./runtime/app/middleware/auth-logged-in'),
        global: options.clientMiddleware.global === true,
      })

      // Register auth-logged-out middleware (always non-global, per-page only)
      addRouteMiddleware({
        name: 'auth-logged-out',
        path: resolver.resolve('./runtime/app/middleware/auth-logged-out'),
        global: false,
      })
    }

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
    nuxt.options.nitro.scheduledTasks['0 2 * * *'] = [
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
        path: resolver.resolve('./runtime/app/router.options'),
      })
    })

    nuxt.options.alias['#nuxt-aegis'] = resolver.resolve(
      './runtime/types/index',
    )
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.alias = nitroConfig.alias || {}
      // This tells the Nitro bundler where to find the code at runtime
      nitroConfig.alias['#nuxt-aegis'] = resolver.resolve('./runtime/types/index')
    })

    // Register type augmentations for Nitro route rules
    const typesPath = resolver.resolve('./runtime/types')
    addTypeTemplate({
      filename: 'types/nuxt-aegis-nitro.d.ts',
      getContents: () => {
        return `import type { 
  NitroAegisAuth,
  UserInfoHookPayload,
  SuccessHookPayload,
  ImpersonateCheckPayload,
  ImpersonateFetchTargetPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload
} from ${JSON.stringify(typesPath)}

type NuxtAegisRouteRules = {
  /**
   * Authentication requirement for this route
   * - true | 'required' | 'protected': Route requires authentication
   * - false | 'public' | 'skip': Route is public and skips authentication
   * - undefined: Route is not protected (opt-in behavior)
   */
  auth?: NitroAegisAuth
}

declare module 'nitropack/types' {
  interface NitroRouteRules {
    nuxtAegis?: NuxtAegisRouteRules
  }
  interface NitroRouteConfig {
    nuxtAegis?: NuxtAegisRouteRules
  }
  interface NitroRuntimeHooks {
    /**
     * Hook called after fetching user info from the provider, before storing it.
     * Use this to transform or validate the OAuth provider response.
     */
    'nuxt-aegis:userInfo': (payload: UserInfoHookPayload) => Promise<void> | void
    /**
     * Hook called after successful authentication.
     * Use this for logging, analytics, or database operations.
     */
    'nuxt-aegis:success': (payload: SuccessHookPayload) => Promise<void> | void
    /**
     * Hook called to determine if a user is allowed to impersonate others.
     * Return true to allow, false to deny.
     */
    'nuxt-aegis:impersonate:check': (payload: ImpersonateCheckPayload) => Promise<boolean> | boolean
    /**
     * Hook called to fetch the target user's data for impersonation.
     * Must return the target user's data or null if not found.
     */
    'nuxt-aegis:impersonate:fetchTarget': (payload: ImpersonateFetchTargetPayload) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null
    /**
     * Hook called after impersonation starts successfully (fire-and-forget for audit logging).
     */
    'nuxt-aegis:impersonate:start': (payload: ImpersonateStartPayload) => Promise<void> | void
    /**
     * Hook called after impersonation ends successfully (fire-and-forget for audit logging).
     */
    'nuxt-aegis:impersonate:end': (payload: ImpersonateEndPayload) => Promise<void> | void
  }
}

declare module 'nitropack' {
  interface NitroRouteRules {
    nuxtAegis?: NuxtAegisRouteRules
  }
  interface NitroRouteConfig {
    nuxtAegis?: NuxtAegisRouteRules
  }
}

export {}`
      },
    }, {
      nuxt: true,
      nitro: true,
      node: true,
    })
  },
})
