import { env } from 'node:process'

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
        clientId: env.NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_ID || '',
        clientSecret: env.NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_SECRET || '',
      },
    },
    token: {
      secret: env.NUXT_AEGIS_TOKEN_SECRET || '',
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
    },
  },
})
