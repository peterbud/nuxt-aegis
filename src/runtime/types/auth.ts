/**
 * Explicit client-side authentication resolution state.
 */
export type AuthStatus = 'unknown' | 'authenticated' | 'guest'

export type AuthError
  = | { category: 'session_expired', message: string, status: 401 }
    | { category: 'network_error', message: string }
    | { category: 'server_error', message: string, status?: number }
    | { category: 'forbidden', message: string, status: 403 }
    | { category: 'operation_error', message: string, operation: 'login' | 'logout' | 'update_claims' | 'refresh' | 'impersonate' | 'stop_impersonation', status?: number }
