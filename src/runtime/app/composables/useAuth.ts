import type { ComputedRef } from 'vue'
import { useRuntimeConfig, navigateTo, useState, computed } from '#imports'
import type { TokenPayload } from '../../types'
import { clearAccessToken } from '../utils/tokenStore'
import { createLogger } from '../utils/logger'

const logger = createLogger('Auth')

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
 * This composable provides methods for OAuth authentication using a CODE-based flow:
 *
 * Authentication Flow:
 * 1. CL-7, PR-5: login() redirects to OAuth provider authentication page
 * 2. PR-10, PR-11: Provider redirects back with short-lived authorization CODE (60s)
 * 3. CL-10, CL-22: AuthCallback page exchanges CODE for JWT tokens via /auth/token
 * 4. CL-18, SC-7: Access token stored in memory (reactive ref, cleared on refresh)
 * 5. EP-16, SC-3, SC-4, SC-5: Refresh token stored as HttpOnly, Secure cookie
 *
 * Token Storage:
 * - CL-18: Access token in memory only (NOT sessionStorage)
 * - CL-19, SC-7: Automatically cleared on page refresh/window close
 * - CL-20: Refresh token cookie used to obtain new access token after refresh
 *
 * State Management:
 * - CL-2: isLoggedIn reactive property (true when user authenticated)
 * - CL-3: isLoading reactive property (true during state initialization)
 * - CL-4, CL-5, CL-6: user reactive property (null when not authenticated)
 * - CL-11: State synchronized reactively across all components
 *
 * Methods:
 * - CL-7: login(provider) - Initiate OAuth flow
 * - CL-8: logout() - End user session
 * - CL-12, CL-13: refresh() - Restore authentication state
 *
 * Requirements: CL-2 through CL-13, CL-18, CL-19, CL-20, CL-22,
 *               PR-5, PR-10, PR-11, EP-16, SC-3, SC-4, SC-5, SC-7
 *
 * @returns {UseAuthReturn} Authentication state and methods
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
   * Refresh the authentication state by obtaining a new access token
   *
   * CL-12, CL-13, CL-20: Restores authentication state using refresh token cookie
   * EP-27, EP-28: Calls /auth/refresh endpoint to obtain new access token
   * RS-1, RS-2: Server reconstructs token from stored user object (no old token needed)
   *
   * Flow:
   * 1. Call /auth/refresh endpoint (refresh token sent via httpOnly cookie)
   * 2. Server validates refresh token and retrieves stored user object
   * 3. Server generates new access token and rotates refresh token
   * 4. Store new access token in memory
   * 5. Decode token to update user state
   *
   * @throws Clears auth state on 401 (invalid/expired refresh token)
   */
  async function refresh(): Promise<void> {
    authState.value.isLoading = true
    authState.value.error = null

    logger.debug('Refreshing authentication state...')

    try {
      // EP-27: Call refresh endpoint (refresh token sent automatically via httpOnly cookie)
      // RS-1: No old access token needed - server uses stored user object
      // IMPORTANT: Use $fetch directly instead of $api to avoid triggering the 401 interceptor
      // which would cause an infinite refresh loop
      const response = await $fetch<{ accessToken: string }>(`${authPath}/refresh`, {
        method: 'POST',
      })

      if (response?.accessToken) {
        // CL-18: Store new access token in memory (NOT sessionStorage)
        const { setAccessToken } = await import('../utils/tokenStore')
        setAccessToken(response.accessToken)

        // Decode token to get user payload
        const tokenParts = response.accessToken.split('.')
        if (tokenParts[1]) {
          const payload = JSON.parse(atob(tokenParts[1])) as TokenPayload
          authState.value.user = payload
          authState.value.error = null

          logger.debug('Auth state refreshed successfully')
        }
      }
      else {
        // No token received, clear state
        authState.value.user = null
        clearAccessToken()
      }
    }
    catch (error: unknown) {
      // CL-13: Clear state on refresh failure (401 means refresh token expired/invalid)
      authState.value.user = null
      authState.value.error = 'Failed to refresh authentication'
      clearAccessToken()

      logger.error('Auth refresh failed:', error)

      // Don't throw - just clear state and let app handle unauthenticated state
    }
    finally {
      authState.value.isLoading = false
    }
  }

  /**
   * Method to initiate authentication flow
   *
   * Redirects the user to the OAuth provider's authentication page.
   * After successful authentication, the provider will redirect back to /auth/callback
   * with a short-lived authorization CODE (valid for 60 seconds).
   * The callback page will exchange this CODE for JWT tokens.
   *
   * @param {string} provider - OAuth provider name (e.g., 'google', 'github', 'auth0')
   * @param {string} _redirectTo - Reserved for future use; redirect path after authentication
   * @throws {Error} If provider is invalid
   *
   * @see Requirements: PR-10, PR-11, CS-1, CL-21
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
      logger.error('Login error:', error)
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
      // Use $fetch directly to avoid triggering interceptors
      await $fetch(`${authPath}/logout`, { method: 'POST' })

      // Clear local auth state
      authState.value.user = null
    }
    catch (error) {
      // Clear state even if API call fails
      authState.value.user = null
      authState.value.error = 'Logout completed with errors'
      logger.error('Logout error:', error)

      // Still redirect on error
      const logoutRedirect = redirectTo || '/'
      await navigateTo(logoutRedirect)
    }
    finally {
      // CL-19: Clear access token from memory (NOT sessionStorage)
      clearAccessToken()

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
