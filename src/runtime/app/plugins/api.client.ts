import { defineNuxtPlugin, navigateTo } from '#app'
import { useAuth } from '../composables/useAuth'
import { getAccessToken } from '../utils/tokenStore'
import { isRouteMatch } from '../utils/routeMatching'
import { createLogger } from '../utils/logger'
import { validateRedirectPath } from '../utils/redirectValidation'

const logger = createLogger('API:Client')

/**
 * Client-side api plugin
 * Intercepts API calls and attaches authorization bearer token from memory
 * See: https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch
 */
export default defineNuxtPlugin({
  name: 'nuxt-aegis-api-client',
  async setup(nuxtApp): Promise<{ provide: { api: typeof $fetch } }> {
    const autoRefreshEnabled = nuxtApp.$config.public.nuxtAegis.tokenRefresh.automaticRefresh ?? true
    const refreshAttempted = Symbol('aegis-refresh-attempted')
    let refreshPromise: Promise<string> | null = null

    function attemptTokenRefresh(): Promise<string> {
      if (refreshPromise) {
        return refreshPromise
      }
      logger.debug('Attempting token refresh...')

      refreshPromise = nuxtApp.runWithContext(async () => {
        const auth = useAuth()
        try {
          await auth.refresh()
          const token = getAccessToken()
          if (!token) {
            throw new Error('Token refresh did not provide an access token')
          }
          return token
        }
        catch (error) {
          if (auth.error.value?.category === 'session_expired') {
            const errorUrl = validateRedirectPath(nuxtApp.$config.public.nuxtAegis.redirect?.error || '/')
            await nuxtApp.runWithContext(() => navigateTo(`${errorUrl}?error=token_refresh_failed&error_description=${encodeURIComponent('Session expired. Please log in again.')}`))
          }
          throw error
        }
      }).finally(() => {
        refreshPromise = null
      })
      return refreshPromise
    }

    // CL-17, CL-18: Attach in-memory access token to API requests
    const api = $fetch.create({
      onRequest({ options }) {
        // CL-18: Get token from memory, not sessionStorage
        const token = getAccessToken()

        if (token) {
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      },
      async onResponseError({ options, response }) {
        if (response.status !== 401) {
          return
        }
        options.retry = 0
        const requestOptions = options as typeof options & { [refreshAttempted]?: boolean }
        if (!autoRefreshEnabled || requestOptions[refreshAttempted]) {
          return
        }
        requestOptions[refreshAttempted] = true
        const newToken = await attemptTokenRefresh()
        options.headers.set('Authorization', `Bearer ${newToken}`)
        options.retry = 1
        options.retryStatusCodes = [401]
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
    if (autoRefreshEnabled) {
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
            const publicRoutes = nuxtApp.$config.public.nuxtAegis?.clientMiddleware?.publicRoutes || []
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
            await useAuth().ensureResolved()
          }
          catch {
            logger.debug('Auth state remains unresolved after startup; resolution can be retried')
          }
        })
      })
    }

    return result
  },
})
