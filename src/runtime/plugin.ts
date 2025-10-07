import { defineNuxtPlugin } from '#app'

/**
 * Nuxt Aegis authentication plugin
 * Initializes the authentication state on app startup
 */
export default defineNuxtPlugin(async (_nuxtApp) => {
  // Plugin can be used to initialize global auth state
  // Currently minimal as auth state is handled by the composable
  if (import.meta.dev) {
    console.log('[Nuxt Aegis] Authentication plugin loaded')
  }
})
