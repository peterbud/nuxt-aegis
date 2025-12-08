import { defineNuxtPlugin, useRequestEvent } from '#app'

/**
 * Server-side api plugin for SSR
 * Attaches SSR access token from event.context to $api requests
 *
 * Note: This creates a custom $api instance with SSR token injection.
 * It will only work when explicitly called via useNuxtApp().$api
 */
export default defineNuxtPlugin({
  name: 'api-server',
  enforce: 'pre',
  async setup() {
    // Create $api instance with SSR token attachment
    const api = $fetch.create({
      onRequest({ options }) {
        // Get the current request event dynamically
        const event = useRequestEvent()

        // Attach SSR access token if available
        const ssrAccessToken = event?.context?.ssrAccessToken
        if (ssrAccessToken) {
          options.headers = options.headers || {}
          if (options.headers instanceof Headers) {
            options.headers.set('Authorization', `Bearer ${ssrAccessToken}`)
          }
          else if (Array.isArray(options.headers)) {
            (options.headers as [string, string][]).push(['Authorization', `Bearer ${ssrAccessToken}`])
          }
          else {
            (options.headers as Record<string, string>).Authorization = `Bearer ${ssrAccessToken}`
          }
        }
      },
    })

    return {
      provide: {
        api,
      },
    }
  },
})
