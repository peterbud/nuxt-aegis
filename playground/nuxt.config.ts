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
      // Mock provider for development/testing (works without credentials)
      mock: {
        clientId: 'mock-playground-client',
        clientSecret: 'mock-playground-secret',
        mockUsers: {
          admin: {
            sub: 'mock-admin-001',
            email: 'admin@example.com',
            name: 'Admin User',
            given_name: 'Admin',
            family_name: 'User',
            role: 'admin',
            permissions: ['read', 'write', 'delete'],
            email_verified: true,
          },
          user: {
            sub: 'mock-user-002',
            email: 'user@example.com',
            name: 'Regular User',
            given_name: 'Regular',
            family_name: 'User',
            subscription: 'basic',
            role: 'user',
            permissions: ['read'],
            email_verified: true,
          },
          premium: {
            sub: 'mock-premium-003',
            email: 'premium@example.com',
            name: 'Premium User',
            subscription: 'premium',
            role: 'user',
            permissions: ['read'],
            email_verified: true,
          },
        },
        defaultUser: 'user',
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
    // Impersonation configuration (opt-in feature)
    impersonation: {
      enabled: true,
      tokenExpiration: 900, // 15 minutes for impersonated sessions
    },
    // Logging configuration (optional)
    // logging: {
    //   Log level: 'silent' | 'error' | 'warn' | 'info' | 'debug' (default: 'info')
    //   level: 'debug',
    //   Enable security event logging (default: false, auto-enabled at debug level)
    //   security: true,
    // },
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
  },
})
