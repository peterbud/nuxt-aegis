import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#app'
import { useAuth } from '../composables/useAuth'
import { isRouteMatch } from '../utils/routeMatching'

/**
 * Client-side middleware for protecting routes that require authentication
 *
 * This middleware redirects unauthenticated users to the login page.
 * It can be used globally or on specific pages using definePageMeta.
 *
 * Usage:
 * - Global: Configure in module options with clientMiddleware.global = true
 * - Per-page: definePageMeta({ middleware: ['auth-logged-in'] })
 *
 * Note: This is client-side only and improves UX. Server-side validation
 * via Nitro routeRules is still required for security.
 */
export default defineNuxtRouteMiddleware((to) => {
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

  // Only check publicRoutes if middleware is registered globally
  // When used per-page via definePageMeta, the developer explicitly chooses
  // which pages to protect, so publicRoutes check is redundant
  if (clientMiddleware.global) {
    const publicRoutes = clientMiddleware.publicRoutes || []
    const isPublicRoute = isRouteMatch(to.path, publicRoutes)

    if (isPublicRoute) {
      return
    }
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn.value) {
    return navigateTo(clientMiddleware.redirectTo || '/login')
  }
})

// Named export for explicit usage in definePageMeta
export { default as authLoggedIn } from './auth-logged-in'
