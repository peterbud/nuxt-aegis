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
  },
})
