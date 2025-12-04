import { defineNuxtPlugin, navigateTo, useRuntimeConfig } from '#app'
import { useAuth } from '#imports'
import { getAccessToken, clearAccessToken } from '../utils/tokenStore'
import { isRouteMatch } from '../utils/routeMatching'
import { createLogger } from '../utils/logger'
import { validateRedirectPath } from '../utils/redirectValidation'

const logger = createLogger('API')

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

  async function attemptTokenRefresh(): Promise<string | null> {
    if (isRefreshing) return refreshPromise

    logger.debug('Attempting token refresh...')

    isRefreshing = true
    refreshPromise = nuxtApp.runWithContext(async () => {
      const auth = useAuth()
      try {
        await auth.refresh()
        return getAccessToken()
      }
      catch (error) {
        logger.error('Token refresh failed:', error)
        return null
      }
      finally {
        isRefreshing = false
        refreshPromise = null
      }
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

        // Refresh failed, clear token and redirect to configured error URL
        // CL-19: Clear token from memory, not sessionStorage
        clearAccessToken()
        const config = useRuntimeConfig()
        const errorUrl = validateRedirectPath(config.public.nuxtAegis.redirect?.error || '/')
        await nuxtApp.runWithContext(() => navigateTo(`${errorUrl}?error=token_refresh_failed&error_description=${encodeURIComponent('Session expired. Please log in again.')}`))
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

  // CL-12, CL-20: Initialize auth state on plugin startup by attempting token refresh
  // EP-27, RS-1: Refresh endpoint uses httpOnly cookie, no token needed in memory
  if (!isInitialized && autoRefreshEnabled) {
    isInitialized = true

    logger.debug('Initializing auth state on startup...')

    // Use app:mounted to ensure the plugin is fully initialized
    nuxtApp.hook('app:mounted', async () => {
      await nuxtApp.runWithContext(async () => {
        // Skip refresh if we're on the auth callback page
        // The callback page will handle setting up auth state after token exchange
        const callbackPath = nuxtApp.$config.public.nuxtAegis.callbackPath
        if (typeof window !== 'undefined' && window.location.pathname === callbackPath) {
          logger.debug('On auth callback page, skipping refresh')
          return
        }

        // Check if current route is public - skip refresh if it is
        if (typeof window !== 'undefined') {
          const publicRoutes = nuxtApp.$config.public.nuxtAegis?.routeProtection?.publicRoutes || []
          const currentPath = window.location.pathname

          if (isRouteMatch(currentPath, publicRoutes)) {
            logger.debug('On public route, skipping refresh on startup')
            return
          }
        }

        // Only attempt refresh if we don't already have an access token
        // This prevents conflicts with the AuthCallback page which sets the token directly
        const currentToken = getAccessToken()
        if (currentToken) {
          logger.debug('Access token already present, skipping refresh on startup')
          return
        }

        try {
          // Try to refresh using the httpOnly refresh token cookie
          await useAuth().refresh()
        }
        catch {
          // Silent failure - user is just not authenticated
          logger.debug('No valid refresh token found on startup')
        }
      })
    })
  }

  return result
})
