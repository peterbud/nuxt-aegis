export default defineNuxtConfig({
  modules: [
    '../src/module',
  ],
  ssr: false,
  devtools: { enabled: true },
  compatibilityDate: '2025-10-04',
  nuxtAegis: {
    providers: {
      google: {
        clientId: process.env.NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        clientId: process.env.NUXT_AEGIS_PROVIDERS_GITHUB_CLIENT_ID || '',
        clientSecret: process.env.NUXT_AEGIS_PROVIDERS_GITHUB_CLIENT_SECRET || '',
      },
      auth0: {
        clientId: process.env.NUXT_AEGIS_PROVIDERS_AUTH0_CLIENT_ID || '',
        clientSecret: process.env.NUXT_AEGIS_PROVIDERS_AUTH0_CLIENT_SECRET || '',
        domain: process.env.NUXT_AEGIS_PROVIDERS_AUTH0_DOMAIN || '',
      },
    },
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET || '',
      expiresIn: '15m',
    },
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true,
    },
    routeProtection: {
      // Configure routes that should automatically get the bearer token
      protectedRoutes: [
        '/api/**',
      ],
      publicRoutes: [
        '/',
        '/public/**',
      ],
    },

    // Module-level hooks - serve as fallback when provider-level hooks are not defined
    // These demonstrate global authentication event handling
    onUserInfo: (user, _tokens, _event) => {
      console.log('[Module] Default user info transformation (fallback)', {
        hasUser: !!user,
        hasTokens: !!_tokens.access_token,
      })
      // Provider-level onUserInfo takes precedence, so this is only called
      // if a provider doesn't define its own onUserInfo hook
      return user
    },

    onSuccess: async ({ user, provider }) => {
      console.log('[Module] Global success hook - user authenticated', {
        provider,
        userId: user.id || user.sub || user.email,
        timestamp: new Date().toISOString(),
      })

      // This runs AFTER provider-level onSuccess hooks
      // Perfect for global logging, analytics, or cross-provider actions

      // Example: Log to analytics service
      // await analytics.track('user_authenticated', {
      //   provider,
      //   userId: user.id,
      // })
    },
  },
})
