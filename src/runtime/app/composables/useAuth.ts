import type { ComputedRef } from 'vue'
import { useRuntimeConfig, navigateTo, useState, computed } from '#imports'
import type { BaseTokenClaims } from '../../types'
import { clearAccessToken, setAccessToken, getAccessToken } from '../utils/tokenStore'
import { createLogger } from '../utils/logger'
import { validateRedirectPath } from '../utils/redirectValidation'
import { filterTimeSensitiveClaims } from '../utils/tokenUtils'

const logger = createLogger('Auth')

/**
 * Internal authentication state interface
 */
interface AuthState {
  /** Current user data from JWT token */
  user: BaseTokenClaims | null
  /** Loading state indicator */
  isLoading: boolean
  /** Error message if authentication fails */
  error: string | null
}

/**
 * Return type for the useAuth composable
 * @template T - Token payload type extending BaseTokenClaims (defaults to BaseTokenClaims)
 */
interface UseAuthReturn<T extends BaseTokenClaims = BaseTokenClaims> {
  /** Reactive property indicating whether a user is logged in */
  isLoggedIn: ComputedRef<boolean>
  /** Reactive property indicating the authentication state is being initialized */
  isLoading: ComputedRef<boolean>
  /** Reactive property containing the current user's data */
  user: ComputedRef<T | null>
  /** Error state for authentication operations */
  error: ComputedRef<string | null>
  /** Reactive property indicating if currently impersonating another user */
  isImpersonating: ComputedRef<boolean>
  /** Reactive property containing original user data when impersonating */
  originalUser: ComputedRef<{ originalUserId: string, originalUserEmail?: string, originalUserName?: string } | null>
  /** Method to initiate the authentication flow */
  login: (provider?: string, redirectTo?: string) => Promise<void>
  /** Method to end the user session */
  logout: (redirectTo?: string) => Promise<void>
  /** Method to refresh the authentication state */
  refresh: (options?: { updateClaims?: boolean }) => Promise<void>
  /** Method to impersonate another user (admin only) */
  impersonate: (targetUserId: string, reason?: string) => Promise<void>
  /** Method to stop impersonation and restore original session */
  stopImpersonation: () => Promise<void>
}

/**
 * Composable for managing authentication state and actions
 *
 * This composable provides methods for OAuth authentication using a CODE-based flow:
 *
 * Authentication Flow:
 * 1. login() redirects to OAuth provider authentication page
 * 2. Provider redirects back with short-lived authorization CODE (60s)
 * 3. AuthCallback page exchanges CODE for JWT tokens via /auth/token
 * 4. Access token stored in memory (reactive ref, cleared on refresh)
 * 5. Refresh token stored as HttpOnly, Secure cookie
 *
 * Token Storage:
 * - Access token in memory only (NOT sessionStorage)
 * - Automatically cleared on page refresh/window close
 * - Refresh token cookie used to obtain new access token after refresh
 *
 * State Management:
 * - isLoggedIn reactive property (true when user authenticated)
 * - isLoading reactive property (true during state initialization)
 * - user reactive property (null when not authenticated)
 * - State synchronized reactively across all components
 *
 * Methods:
 * - login(provider) - Initiate OAuth flow
 * - logout() - End user session
 * - refresh(options?) - Restore authentication state, optionally with updated claims
 *
 * @template T - Custom token payload type extending BaseTokenClaims
 * @returns {UseAuthReturn<T>} Authentication state and methods
 *
 * @example
 * ```typescript
 * // Without custom claims (default)
 * const { user, login, logout } = useAuth()
 *
 * // With custom claims
 * import type { CustomTokenClaims } from '#nuxt-aegis'
 *
 * type AppTokenClaims = CustomTokenClaims<{
 *   role: string
 *   permissions: string[]
 *   organizationId: string
 * }>
 *
 * const { user, login, logout } = useAuth<AppTokenClaims>()
 * // user.value?.role is now type-safe
 * ```
 */
export function useAuth<T extends BaseTokenClaims = BaseTokenClaims>(): UseAuthReturn<T> {
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

  /**
   * Computed property indicating if currently impersonating another user
   */
  const isImpersonating = computed(() => !!authState.value?.user?.impersonation)

  /**
   * Computed property containing original user data when impersonating
   */
  const originalUser = computed(() => {
    const impersonation = authState.value?.user?.impersonation
    if (!impersonation) {
      return null
    }
    return {
      originalUserId: impersonation.originalUserId,
      originalUserEmail: impersonation.originalUserEmail,
      originalUserName: impersonation.originalUserName,
    }
  })

  const config = useRuntimeConfig()
  const publicConfig = config.public
  const authPath = publicConfig.nuxtAegis?.authPath
  const loginPath = publicConfig.nuxtAegis?.loginPath || authPath
  const logoutPath = publicConfig.nuxtAegis?.logoutPath
  const refreshPath = publicConfig.nuxtAegis?.refreshPath

  /**
   * Refresh the authentication state by obtaining a new access token
   *
   * Restores authentication state using refresh token cookie
   * Calls /auth/refresh endpoint to obtain new access token
   * Server reconstructs token from stored user object (no old token needed)
   *
   * Flow:
   * 1. Call /auth/refresh endpoint (refresh token sent via httpOnly cookie)
   * 2. Server validates refresh token and retrieves stored user object
   * 3. Server generates new access token and rotates refresh token
   * 4. Store new access token in memory
   * 5. Decode token to update user state
   *
   * @param {Object} options - Optional configuration
   * @param {boolean} options.updateClaims - When true, recomputes custom claims before refreshing (default: false)
   * @throws {Error} If refresh or claims update fails
   */
  async function refresh(options?: { updateClaims?: boolean }): Promise<void> {
    authState.value.isLoading = true
    authState.value.error = null

    logger.debug('Refreshing authentication state...', { updateClaims: options?.updateClaims })

    try {
      // Optionally recompute custom claims before refreshing
      if (options?.updateClaims) {
        logger.debug('Updating custom claims before refresh...')
        await $fetch<{ success: boolean, message: string }>(`${authPath}/update-claims`, {
          method: 'POST',
        })
        logger.debug('Claims updated successfully in storage')
      }

      // EP-27: Call refresh endpoint (refresh token sent automatically via httpOnly cookie)
      // RS-1: No old access token needed - server uses stored user object
      // IMPORTANT: Use $fetch directly instead of $api to avoid triggering the 401 interceptor
      // which would cause an infinite refresh loop
      const response = await $fetch<{ accessToken: string }>(`${refreshPath}`, {
        method: 'POST',
      })

      if (response?.accessToken) {
        // CL-18: Store new access token in memory (NOT sessionStorage)
        setAccessToken(response.accessToken)

        // Decode token to get user payload
        const tokenParts = response.accessToken.split('.')
        if (tokenParts[1]) {
          const payload = JSON.parse(atob(tokenParts[1])) as BaseTokenClaims
          // Filter time-sensitive JWT metadata to prevent hydration mismatches
          authState.value.user = filterTimeSensitiveClaims(payload)
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
      throw error
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
   */
  async function login(provider = 'google', _redirectTo?: string): Promise<void> {
    try {
      authState.value.error = null

      // Validate provider parameter
      if (!provider || typeof provider !== 'string') {
        throw new Error('Provider must be a non-empty string')
      }

      // Build login URL with optional redirect
      await navigateTo(`${loginPath}/${provider}`, { external: true })
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
    const config = useRuntimeConfig()

    try {
      authState.value.error = null

      // Call logout endpoint - this will delete the httpOnly cookie
      // Use $fetch directly to avoid triggering interceptors
      await $fetch(`${logoutPath}`, { method: 'POST' })

      // Clear local auth state
      authState.value.user = null
    }
    catch (error) {
      // Clear state even if API call fails
      authState.value.user = null
      authState.value.error = 'Logout completed with errors'
      logger.error('Logout error:', error)
    }
    finally {
      // CL-19: Clear access token from memory (NOT sessionStorage)
      clearAccessToken()

      // Redirect to specified URL (parameter takes precedence) or configured default
      const logoutRedirect = redirectTo
        ? validateRedirectPath(redirectTo)
        : validateRedirectPath(config.public.nuxtAegis.redirect?.logout || '/')
      await navigateTo(logoutRedirect)
    }
  }

  /**
   * Method to impersonate another user (requires admin privileges)
   *
   * Exchanges current session for an impersonated session. The impersonated
   * session has a shorter expiration time and cannot be refreshed. Use
   * stopImpersonation() to restore the original session.
   *
   * @param {string} targetUserId - The ID or email of the user to impersonate
   * @param {string} reason - Optional reason for impersonation (for audit logs)
   * @throws {Error} If impersonation is not enabled or not allowed
   */
  async function impersonate(targetUserId: string, reason?: string): Promise<void> {
    try {
      authState.value.error = null
      authState.value.isLoading = true

      logger.debug('Starting impersonation...', { targetUserId })

      // Get current access token to authenticate the request
      const currentToken = getAccessToken()

      if (!currentToken) {
        throw new Error('Must be authenticated to impersonate')
      }

      // Call impersonate endpoint
      const response = await $fetch<{ accessToken: string }>(`${authPath}/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        body: {
          targetUserId,
          reason,
        },
      })

      if (response?.accessToken) {
        // Store new impersonated access token
        setAccessToken(response.accessToken)

        // Decode token to get impersonated user payload
        const tokenParts = response.accessToken.split('.')
        if (tokenParts[1]) {
          const payload = JSON.parse(atob(tokenParts[1])) as BaseTokenClaims
          // Filter time-sensitive JWT metadata to prevent hydration mismatches
          authState.value.user = filterTimeSensitiveClaims(payload)
          authState.value.error = null

          logger.debug('Impersonation started successfully', {
            targetUser: payload.sub,
            originalUser: payload.impersonation?.originalUserId,
          })
        }
      }
    }
    catch (error: unknown) {
      const err = error as { statusCode?: number, message?: string, data?: { message?: string } }
      authState.value.error = err.data?.message || err.message || 'Failed to start impersonation'
      logger.error('Impersonation failed:', error)
      throw error
    }
    finally {
      authState.value.isLoading = false
    }
  }

  /**
   * Method to stop impersonation and restore original user session
   *
   * Ends the impersonated session and restores the original user's session
   * with full privileges and refresh token capability.
   *
   * @throws {Error} If not currently impersonating or restoration fails
   */
  async function stopImpersonation(): Promise<void> {
    try {
      authState.value.error = null
      authState.value.isLoading = true

      logger.debug('Stopping impersonation...')

      // Get current impersonated token
      const currentToken = getAccessToken()

      if (!currentToken) {
        throw new Error('No active session')
      }

      // Call unimpersonate endpoint
      const response = await $fetch<{ accessToken: string }>(`${authPath}/unimpersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (response?.accessToken) {
        // Store restored access token
        setAccessToken(response.accessToken)

        // Decode token to get restored user payload
        const tokenParts = response.accessToken.split('.')
        if (tokenParts[1]) {
          const payload = JSON.parse(atob(tokenParts[1])) as BaseTokenClaims
          // Filter time-sensitive JWT metadata to prevent hydration mismatches
          authState.value.user = filterTimeSensitiveClaims(payload)
          authState.value.error = null

          logger.debug('Impersonation stopped, original session restored', {
            restoredUser: payload.sub,
          })
        }
      }
    }
    catch (error: unknown) {
      const err = error as { statusCode?: number, message?: string, data?: { message?: string } }
      authState.value.error = err.data?.message || err.message || 'Failed to stop impersonation'
      logger.error('Stop impersonation failed:', error)
      throw error
    }
    finally {
      authState.value.isLoading = false
    }
  }

  return {
    isLoggedIn,
    isLoading: computed(() => authState.value.isLoading),
    user: computed(() => authState.value.user as T | null),
    error: computed(() => authState.value.error),
    isImpersonating,
    originalUser,
    login,
    logout,
    refresh,
    impersonate,
    stopImpersonation,
  }
}
