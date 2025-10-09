import { defineNuxtPlugin, navigateTo } from '#app'

/**
 * Nuxt Aegis plugin
 * Intercepts API calls and attaches authorization bearer token
 * See: https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  if (nuxtApp.payload.serverRendered)
    return {}

  // EP-13: Use sessionStorage
  const api = $fetch.create({
    baseURL: 'http://localhost:3000',
    onRequest({ options }) {
      const token = sessionStorage.getItem('nuxt.aegis.token')

      if (token) {
        // note that this relies on ofetch >= 1.4.0 - you may need to refresh your lockfile
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        await nuxtApp.runWithContext(() => navigateTo('/'))
      }
    },
  })

  // Expose to useNuxtApp().$api
  return {
    provide: {
      api,
    },
  }
})
