export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  devtools: { enabled: true },
  compatibilityDate: '2024-11-01',

  // Server-side route protection via Nitro route rules
  nitro: {
    routeRules: {
      // Protect all API routes
      '/api/**': { nuxtAegis: { auth: true } },
    },
  },
  nuxtAegis: {
    token: {
      secret: '',
    },
    providers: {
      google: {
        clientId: '',
        clientSecret: '',
      },
    },
  },
})
