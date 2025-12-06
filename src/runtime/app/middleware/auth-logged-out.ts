import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#app'
import { useAuth } from '../composables/useAuth'

/**
 * Client-side middleware for protecting routes that should only be accessible
 * when NOT authenticated (e.g., login, register pages)
 *
 * This middleware redirects authenticated users away from pages that don't
 * make sense for logged-in users.
 *
 * Usage:
 * - Per-page: definePageMeta({ middleware: ['auth-logged-out'] })
 *
 * Example use cases:
 * - /login - redirect logged-in users to home
 * - /register - redirect logged-in users to dashboard
 * - /forgot-password - redirect logged-in users to home
 *
 * Note: This is client-side only and improves UX.
 */
export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn, isLoading } = useAuth()
  const config = useRuntimeConfig()
  const clientMiddleware = config.public.nuxtAegis?.clientMiddleware

  // If middleware is not configured, skip
  if (!clientMiddleware?.enabled) {
    return
  }

  // Wait for auth state to load
  if (isLoading.value) {
    return
  }

  // Redirect to configured destination if authenticated
  if (isLoggedIn.value) {
    return navigateTo(clientMiddleware.loggedOutRedirectTo || '/')
  }
})

// Named export for explicit usage in definePageMeta
export { default as authLoggedOut } from './auth-logged-out'
