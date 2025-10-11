import { defineNuxtPlugin, navigateTo } from '#app'
import type { RefreshResponse } from '../../types'

/**
 * Nuxt Aegis plugin
 * Intercepts API calls and attaches authorization bearer token
 * See: https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  if (nuxtApp.payload.serverRendered)
    return {}

  let isRefreshing = false
  let refreshPromise: Promise<string | null> | null = null
  const autoRefreshEnabled = nuxtApp.$config.public.nuxtAegis.tokenRefresh.automaticRefresh ?? true
  const authPath = nuxtApp.$config.public.nuxtAegis.authPath

  async function attemptTokenRefresh(): Promise<string | null> {
    if (isRefreshing) return refreshPromise

    console.log('[Nuxt Aegis] Attempting token refresh...')
    isRefreshing = true
    refreshPromise = $fetch<RefreshResponse>(`${authPath}/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('nuxt.aegis.token')}`,
      },
    }).then(async (response) => {
      if (response && 'accessToken' in response && response.accessToken) {
        await sessionStorage.setItem('nuxt.aegis.token', response.accessToken)

        // Refresh auth state after successful token refresh
        const { useAuth } = await import('../composables/useAuth')
        await nuxtApp.runWithContext(async () => {
          await useAuth().refresh()
        })

        return response.accessToken
      }
      return null
    }).finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

    return refreshPromise
  }

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
    async onResponseError({ options, response }) {
      if (response.status === 401 && autoRefreshEnabled) {
        // Attempt token refresh
        const newToken = await attemptTokenRefresh()

        if (newToken) {
          options.headers.set('Authorization', `Bearer ${newToken}`)
          // Retry the request by re-throwing with retry
          // ofetch will handle the retry automatically
          return
        }

        // Refresh failed, clear token and redirect to login
        sessionStorage.removeItem('nuxt.aegis.token')
        await nuxtApp.runWithContext(() => navigateTo('/'))
      }
    },
    retry: autoRefreshEnabled ? 1 : 0,
    retryStatusCodes: [401],
  })

  // Expose as useNuxtApp().$api
  return {
    provide: {
      api,
    },
  }
})
