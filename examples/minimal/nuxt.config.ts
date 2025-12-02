export default defineNuxtConfig({
  modules: ['nuxt-aegis'],
  ssr: false,
  devtools: { enabled: true },
  compatibilityDate: '2024-11-01',

  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!,
    },
    providers: {
      google: {
        clientId: process.env.NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_SECRET || '',
      },
    },
  },
})
