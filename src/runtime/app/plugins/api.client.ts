import { defineNuxtPlugin, navigateTo } from '#app'
import type { RefreshResponse } from '../../types'
import { useAuth } from '#imports'
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/tokenStore'

/**
 * Nuxt Aegis plugin
 * CL-17: Intercepts API calls and attaches authorization bearer token from memory
 * See: https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  if (nuxtApp.payload.serverRendered)
    return {}

  let isRefreshing = false
  let refreshPromise: Promise<string | null> | null = null
  let isInitialized = false
  const autoRefreshEnabled = nuxtApp.$config.public.nuxtAegis.tokenRefresh.automaticRefresh ?? true
  const authPath = nuxtApp.$config.public.nuxtAegis.authPath

  async function attemptTokenRefresh(): Promise<string | null> {
    if (isRefreshing) return refreshPromise

    console.log('[Nuxt Aegis] Attempting token refresh...')
    isRefreshing = true
    refreshPromise = $fetch<RefreshResponse>(`${authPath}/refresh`, {
      method: 'POST',
      headers: {
        // CL-18: Get token from memory, not sessionStorage
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }).then(async (response) => {
      if (response && 'accessToken' in response && response.accessToken) {
        // CL-18: Store new token in memory, not sessionStorage
        setAccessToken(response.accessToken)

        // Refresh auth state after successful token refresh
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

  // CL-17, CL-18: Attach in-memory access token to API requests
  const api = $fetch.create({
    baseURL: 'http://localhost:3000',
    onRequest({ options }) {
      // CL-18: Get token from memory, not sessionStorage
      const token = getAccessToken()

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
        // CL-19: Clear token from memory, not sessionStorage
        clearAccessToken()
        await nuxtApp.runWithContext(() => navigateTo('/'))
      }
    },
    retry: autoRefreshEnabled ? 1 : 0,
    retryStatusCodes: [401],
  })

  // Expose as useNuxtApp().$api
  const result = {
    provide: {
      api,
    },
  }

  // CL-12: Initialize auth state on plugin startup if token exists in memory
  // This must happen AFTER $api is provided
  const existingToken = getAccessToken()
  if (existingToken && !isInitialized) {
    isInitialized = true

    if (import.meta.dev) {
      console.log('[Nuxt Aegis] Initializing auth state on startup...')
    }

    // Use nextTick to ensure the plugin is fully initialized
    nuxtApp.hook('app:mounted', async () => {
      await nuxtApp.runWithContext(async () => {
        try {
          await useAuth().refresh()
        }
        catch (error) {
          if (import.meta.dev) {
            console.error('[Nuxt Aegis] Failed to initialize auth state:', error)
          }
        }
      })
    })
  }

  return result
})
