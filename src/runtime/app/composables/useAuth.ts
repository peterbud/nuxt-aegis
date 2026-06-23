import type { ComputedRef } from 'vue'
import { useRuntimeConfig, navigateTo, useState, computed } from '#imports'
import type { AuthStatus, BaseTokenClaims } from '../../types'
import { clearAccessToken, setAccessToken, getAccessToken } from '../utils/tokenStore'
import { createLogger } from '../utils/logger'
import { validateRedirectPath } from '../utils/redirectValidation'
import { filterTimeSensitiveClaims } from '../utils/tokenUtils'

const logger = createLogger('Auth')
let initialResolutionPromise: Promise<void> | null = null
let refreshPromise: Promise<void> | null = null

function decodeAccessToken(accessToken: string): BaseTokenClaims {
  const tokenParts = accessToken.split('.')

  if (!tokenParts[1]) {
    throw new Error('Invalid access token payload')
  }

  return JSON.parse(atob(tokenParts[1])) as BaseTokenClaims
}

/**
 * Internal authentication state interface
 */
interface AuthState {
  /** Current user data from JWT token */
  user: BaseTokenClaims | null
  /** Explicit auth resolution state */
  authStatus: AuthStatus
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
  /** Explicit authentication status */
  authStatus: ComputedRef<AuthStatus>
  /** Reactive property indicating whether initial auth state is resolved */
  isResolved: ComputedRef<boolean>
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
  originalUser: ComputedRef<{ originalUserSub: string, originalUserEmail?: string, originalUserName?: string } | null>
  /** Method to initiate the authentication flow */
  login: (provider?: string, redirectTo?: string) => Promise<void>
  /** Method to end the user session */
  logout: (redirectTo?: string) => Promise<void>
  /** Method to refresh the authentication state */
  refresh: (options?: { updateClaims?: boolean }) => Promise<void>
  /** Method to resolve initial authentication state */
  ensureResolved: () => Promise<void>
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
      return { user: null, authStatus: 'unknown', isLoading: false, error: null }
    },
  )

  function setAuthenticatedState(user: BaseTokenClaims): void {
    authState.value.user = filterTimeSensitiveClaims(user)
    authState.value.authStatus = 'authenticated'
    authState.value.error = null
  }

  function setGuestState(error: string | null = null): void {
    authState.value.user = null
    authState.value.authStatus = 'guest'
    authState.value.error = error
  }

  function applyAccessToken(accessToken: string): void {
    setAccessToken(accessToken)
    setAuthenticatedState(decodeAccessToken(accessToken))
  }

  async function performRefresh(
    options?: { updateClaims?: boolean },
    settings?: { silentFailure?: boolean },
  ): Promise<void> {
    authState.value.isLoading = true
    authState.value.error = null

    logger.debug('Refreshing authentication state...', { updateClaims: options?.updateClaims })

    try {
      if (options?.updateClaims) {
        logger.debug('Updating custom claims before refresh...')
        await $fetch<{ success: boolean, message: string }>(`${authPath}/update-claims`, {
          method: 'POST',
        })
        logger.debug('Claims updated successfully in storage')
      }

      const response = await $fetch<{ accessToken: string }>(`${refreshPath}`, {
        method: 'POST',
      })

      if (response?.accessToken) {
        applyAccessToken(response.accessToken)
        logger.debug('Auth state refreshed successfully')
        return
      }

      clearAccessToken()
      setGuestState()
    }
    catch (error: unknown) {
      clearAccessToken()
      setGuestState(settings?.silentFailure ? null : 'Failed to refresh authentication')

      logger.error('Auth refresh failed:', error)
      throw error
    }
    finally {
      authState.value.isLoading = false
    }
  }

  function queueRefresh(
    options?: { updateClaims?: boolean },
    settings?: { silentFailure?: boolean },
  ): Promise<void> {
    if (refreshPromise) {
      return refreshPromise
    }

    refreshPromise = performRefresh(options, settings)
      .finally(() => {
        refreshPromise = null
      })

    return refreshPromise
  }

  /**
   * Computed property indicating if user is logged in
   */
  const isLoggedIn = computed(() => authState.value?.authStatus === 'authenticated')

  /**
   * Computed property indicating if initial auth state is resolved
   */
  const isResolved = computed(() => authState.value?.authStatus !== 'unknown')

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
      originalUserSub: impersonation.originalUserSub,
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
   * @param {object} options - Optional configuration
   * @param {boolean} options.updateClaims - When true, recomputes custom claims before refreshing (default: false)
   * @throws {Error} If refresh or claims update fails
   */
  async function refresh(options?: { updateClaims?: boolean }): Promise<void> {
    await queueRefresh(options)
  }

  async function resolveInitialAuthState(): Promise<void> {
    authState.value.error = null

    const currentToken = getAccessToken()
    if (currentToken) {
      try {
        setAuthenticatedState(decodeAccessToken(currentToken))
        logger.debug('Resolved auth state from in-memory access token')
        return
      }
      catch (error) {
        clearAccessToken()
        logger.error('Failed to decode in-memory access token during initial resolution:', error)
      }
    }

    try {
      await queueRefresh(undefined, { silentFailure: true })
    }
    catch {
      logger.debug('Initial auth resolution determined user is a guest')
    }
    finally {
      if (authState.value.authStatus === 'unknown') {
        setGuestState()
      }
    }
  }

  /**
   * Resolve the initial authentication state.
   *
   * This method is idempotent after the auth state is known and deduplicates
   * concurrent cold-start resolution work across callers.
   */
  async function ensureResolved(): Promise<void> {
    if (authState.value.authStatus !== 'unknown') {
      return
    }

    if (!initialResolutionPromise) {
      initialResolutionPromise = resolveInitialAuthState()
        .finally(() => {
          initialResolutionPromise = null
        })
    }

    return initialResolutionPromise
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
   * @param {string} redirectTo - Optional redirect path after authentication
   * @throws {Error} If provider is invalid
   */
  async function login(provider = 'google', redirectTo?: string): Promise<void> {
    try {
      authState.value.error = null

      // Validate provider parameter
      if (!provider || typeof provider !== 'string') {
        throw new Error('Provider must be a non-empty string')
      }

      const loginUrl = `${loginPath}/${provider}`

      if (redirectTo) {
        const validatedRedirect = validateRedirectPath(redirectTo)
        await navigateTo(`${loginUrl}?redirectTo=${encodeURIComponent(validatedRedirect)}`, { external: true })
        return
      }

      await navigateTo(loginUrl, { external: true })
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
      setGuestState()
    }
    catch (error) {
      // Clear state even if API call fails
      setGuestState('Logout completed with errors')
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
        applyAccessToken(response.accessToken)
        const payload = authState.value.user

        logger.debug('Impersonation started successfully', {
          targetUser: payload?.sub,
          originalUser: payload?.impersonation?.originalUserSub,
        })
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
        applyAccessToken(response.accessToken)
        const payload = authState.value.user

        logger.debug('Impersonation stopped, original session restored', {
          restoredUser: payload?.sub,
        })
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
    authStatus: computed(() => authState.value.authStatus),
    isResolved,
    isLoggedIn,
    isLoading: computed(() => authState.value.isLoading),
    user: computed(() => authState.value.user as T | null),
    error: computed(() => authState.value.error),
    isImpersonating,
    originalUser,
    login,
    logout,
    refresh,
    ensureResolved,
    impersonate,
    stopImpersonation,
  }
}
