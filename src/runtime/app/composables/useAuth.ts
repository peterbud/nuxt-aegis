import type { ComputedRef } from 'vue'
import { useRuntimeConfig, navigateTo, useState, computed, useNuxtApp } from '#imports'
import type { TokenPayload } from '../../types'

/**
 * Internal authentication state interface
 */
interface AuthState {
  /** Current user data from JWT token */
  user: TokenPayload | null
  /** Loading state indicator */
  isLoading: boolean
  /** Error message if authentication fails */
  error: string | null
}

/**
 * Return type for the useAuth composable
 */
interface UseAuthReturn {
  /** Reactive property indicating whether a user is logged in */
  isLoggedIn: ComputedRef<boolean>
  /** Reactive property indicating the authentication state is being initialized */
  isLoading: ComputedRef<boolean>
  /** Reactive property containing the current user's data */
  user: ComputedRef<TokenPayload | null>
  /** Error state for authentication operations */
  error: ComputedRef<string | null>
  /** Method to initiate the authentication flow */
  login: (provider?: string, redirectTo?: string) => Promise<void>
  /** Method to end the user session */
  logout: (redirectTo?: string) => Promise<void>
  /** Method to refresh the authentication state */
  refresh: () => Promise<void>
}

/**
 * Composable for managing authentication state and actions
 *
 */
export function useAuth(): UseAuthReturn {
  // Global auth state
  const authState = useState<AuthState>(
    'auth-state',
    () => {
      return { user: null, isLoading: false, error: null }
    },
  )

  /**
   * Computed property indicating if user is logged in
   */
  const isLoggedIn = computed(() => authState.value?.user !== null)

  const config = useRuntimeConfig()
  const publicConfig = config.public
  const authPath = publicConfig.nuxtAegis?.authPath

  /**
   * Refresh the authentication state by fetching current user
   */
  async function refresh(): Promise<void> {
    authState.value.isLoading = true
    authState.value.error = null

    console.log('[Nuxt Aegis] REFRESH')
    try {
      // check for existing token in sessionStorage
      const existingToken = sessionStorage.getItem('nuxt.aegis.token')
      if (!existingToken) {
        authState.value.user = null
        return
      }

      const userData = await useNuxtApp().$api<TokenPayload>(
        '/api/user/me',
      )

      authState.value.user = userData || null
    }
    catch (error) {
      authState.value.error = 'Failed to refresh authentication'
      if (import.meta.dev) {
        console.error('[Nuxt Aegis] Auth refresh failed:', error)
      }
    }
    finally {
      authState.value.isLoading = false
    }
  }

  /**
   * Method to initiate authentication flow
   */
  async function login(provider = 'google', _redirectTo?: string): Promise<void> {
    try {
      authState.value.error = null

      // Validate provider parameter
      if (!provider || typeof provider !== 'string') {
        throw new Error('Provider must be a non-empty string')
      }

      // Build login URL with optional redirect
      await navigateTo(`${authPath}/${provider}`, { external: true })
    }
    catch (error) {
      authState.value.error = 'Failed to initiate login'
      if (import.meta.dev) {
        console.error('[Nuxt Aegis] Login error:', error)
      }
      throw error
    }
  }

  /**
   * Method to end user session
   */
  async function logout(redirectTo?: string): Promise<void> {
    try {
      authState.value.error = null

      // Call logout endpoint - this will delete the httpOnly cookie
      await useNuxtApp().$api(`${authPath}/logout`, { method: 'POST' })

      // Clear local auth state
      authState.value.user = null
    }
    catch (error) {
      // Clear state even if API call fails
      authState.value.user = null
      authState.value.error = 'Logout completed with errors'
      if (import.meta.dev) {
        console.error('[Nuxt Aegis] Logout error:', error)
      }

      // Still redirect on error
      const logoutRedirect = redirectTo || '/'
      await navigateTo(logoutRedirect)
    }
    finally {
      sessionStorage.removeItem('nuxt.aegis.token')

      // Redirect to specified URL or default
      const logoutRedirect = redirectTo || '/'
      await navigateTo(logoutRedirect)
    }
  }

  return {
    isLoggedIn,
    isLoading: computed(() => authState.value.isLoading),
    user: computed(() => authState.value.user),
    error: computed(() => authState.value.error),
    login,
    logout,
    refresh,
  }
}
