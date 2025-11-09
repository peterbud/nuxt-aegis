import { randomBytes } from 'node:crypto'
import { useStorage } from '#imports'
import { consola } from 'consola'

/**
 * Authorization Code Store Utilities
 *
 * Provides server-side storage and management for short-lived authorization CODEs
 * used in the OAuth 2.0 authorization code flow.
 *
 * Flow:
 * 1. PR-10, PR-11: Generate and store authorization CODE after OAuth authentication
 * 2. CS-1, CS-2: Store CODE with user info and provider tokens in memory
 * 3. CS-4: Set 60-second expiration (configurable via CF-9)
 * 4. EP-11, EP-12: Retrieve and delete CODE when exchanging for tokens
 * 5. CS-6, SC-10: Ensure single-use by immediate deletion
 * 6. CS-5, CS-8: Automatic cleanup of expired CODEs
 *
 * Security Features:
 * - SC-9: Cryptographically secure random CODE generation (crypto.randomBytes)
 * - SC-10: Single-use enforcement (delete immediately after retrieval)
 * - SC-11: Automatic cleanup of expired CODEs
 * - CS-7: Validation before allowing token exchange
 *
 * Requirements: PR-10, PR-11, CS-1 through CS-8, SC-9, SC-10, SC-11, EP-11, EP-12, CF-9
 */

/**
 * Authorization code data stored in the key-value store
 * CS-2: Associates CODE with user information and provider tokens
 */
export interface AuthCodeData {
  /** User information extracted from OAuth provider */
  user: Record<string, unknown>
  /** Provider tokens received from OAuth provider */
  providerTokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  /** Optional custom claims to add to the JWT token */
  customClaims?: Record<string, unknown>
  /** Timestamp when the code expires (milliseconds since epoch) */
  expiresAt: number
  /** Timestamp when the code was created (milliseconds since epoch) */
  createdAt: number
}

/**
 * Generate a cryptographically secure authorization code
 * CS-3: Generate cryptographically secure random CODE value
 * SC-9: Use cryptographically secure random number generation
 *
 * @returns A base64url-encoded random authorization code
 *
 * @example
 * ```typescript
 * const code = generateAuthCode()
 * // Returns: "X7k9mP2nQ5vL8wR4tY6uZ3bN1cM0dF5g"
 * ```
 */
export function generateAuthCode(): string {
  // SC-9: Use crypto.randomBytes for cryptographically secure generation
  const code = randomBytes(32).toString('base64url')

  // Security event logging
  consola.debug('[Nuxt Aegis Security] Authorization code generated', {
    timestamp: new Date().toISOString(),
    event: 'CODE_GENERATED',
    codePrefix: `${code.substring(0, 8)}...`,
  })

  return code
}

/**
 * Store authorization code with associated user and provider data
 * CS-1: Server-side in-memory key-value store for temporary authorization CODE storage
 * CS-2: Associate CODE with user information and provider tokens
 * CS-4: Set expiration time of 60 seconds
 * PR-11: Store CODE in server-side in-memory key-value store
 *
 * @param code - The authorization code to store
 * @param user - User information from OAuth provider
 * @param providerTokens - Tokens received from OAuth provider
 * @param providerTokens.access_token - Provider access token
 * @param providerTokens.refresh_token - Optional provider refresh token
 * @param providerTokens.id_token - Optional provider ID token
 * @param providerTokens.expires_in - Optional token expiration time
 * @param expiresIn - Expiration time in seconds (default: 60)
 * @param customClaims - Optional custom claims to add to the JWT token
 *
 * @example
 * ```typescript
 * await storeAuthCode('X7k9mP...', userInfo, providerTokens)
 * ```
 */
export async function storeAuthCode(
  code: string,
  user: Record<string, unknown>,
  providerTokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  },
  expiresIn = 60, // CS-4: Default 60 seconds
  customClaims?: Record<string, unknown>,
): Promise<void> {
  const now = Date.now()

  const authCodeData: AuthCodeData = {
    user,
    providerTokens,
    customClaims,
    expiresAt: now + (expiresIn * 1000), // CS-4: Set expiration timestamp
    createdAt: now,
  }

  // CS-1: Store in server-side key-value store
  await useStorage('authCodeStore').setItem<AuthCodeData>(code, authCodeData)

  // Security event logging
  consola.debug('[Nuxt Aegis Security] Authorization code stored', {
    timestamp: new Date().toISOString(),
    event: 'CODE_STORED',
    codePrefix: `${code.substring(0, 8)}...`,
    expiresAt: new Date(authCodeData.expiresAt).toISOString(),
    expiresInSeconds: expiresIn,
  })
}

/**
 * Validate that an authorization code exists and has not expired
 * CS-7: Validate that CODE exists in store before allowing token exchange
 *
 * @param code - The authorization code to validate
 * @returns The auth code data if valid, null if invalid or expired
 *
 * @example
 * ```typescript
 * const data = await validateAuthCode('X7k9mP...')
 * if (!data) {
 *   throw new Error('Invalid or expired code')
 * }
 * ```
 */
export async function validateAuthCode(code: string): Promise<AuthCodeData | null> {
  const authCodeData = await useStorage('authCodeStore').getItem<AuthCodeData>(code)

  if (!authCodeData) {
    // Security event logging - code not found (potential security issue)
    consola.warn('[Nuxt Aegis Security] Authorization code not found', {
      timestamp: new Date().toISOString(),
      event: 'CODE_NOT_FOUND',
      codePrefix: `${code.substring(0, 8)}...`,
      severity: 'warning',
    })
    return null
  }

  // Check if code has expired
  if (Date.now() > authCodeData.expiresAt) {
    // Security event logging - expired code usage attempt
    consola.warn('[Nuxt Aegis Security] Authorization code expired', {
      timestamp: new Date().toISOString(),
      event: 'CODE_EXPIRED',
      codePrefix: `${code.substring(0, 8)}...`,
      expiresAt: new Date(authCodeData.expiresAt).toISOString(),
      severity: 'warning',
    })
    // CS-5: Remove expired code
    await useStorage('authCodeStore').removeItem(code)
    return null
  }

  return authCodeData
}

/**
 * Retrieve and delete authorization code in a single atomic operation
 * CS-6: Immediately delete CODE after successful exchange for single-use enforcement
 * CS-7: Prevent CODE reuse by validating existence before deletion
 * SC-10: Ensure single-use only
 * EP-12: Delete CODE from store after validation
 *
 * @param code - The authorization code to retrieve and delete
 * @returns The auth code data if valid, null if invalid, expired, or already used
 *
 * @example
 * ```typescript
 * const data = await retrieveAndDeleteAuthCode('X7k9mP...')
 * if (!data) {
 *   // Code was invalid, expired, or already used
 *   throw new Error('Invalid authorization code')
 * }
 * // Code is valid and has been consumed (deleted)
 * ```
 */
export async function retrieveAndDeleteAuthCode(code: string): Promise<AuthCodeData | null> {
  // First validate the code
  const authCodeData = await validateAuthCode(code)

  if (!authCodeData) {
    // EP-18: Code is invalid, expired, or not found
    // Security event logging - failed exchange attempt
    consola.warn('[Nuxt Aegis Security] Invalid authorization code exchange attempt', {
      timestamp: new Date().toISOString(),
      event: 'CODE_EXCHANGE_FAILED',
      codePrefix: `${code.substring(0, 8)}...`,
      reason: 'invalid_or_expired',
      severity: 'warning',
    })
    return null
  }

  // CS-6, SC-10: Delete the code immediately to ensure single use
  await useStorage('authCodeStore').removeItem(code)

  // Security event logging - successful exchange
  consola.debug('[Nuxt Aegis Security] Authorization code successfully exchanged', {
    timestamp: new Date().toISOString(),
    event: 'CODE_EXCHANGE_SUCCESS',
    codePrefix: `${code.substring(0, 8)}...`,
    codeAge: Date.now() - authCodeData.createdAt,
  })

  return authCodeData
}

/**
 * Clean up expired authorization codes from storage
 * CS-5: Automatically remove expired CODEs
 * CS-8: Support automatic cleanup without blocking requests
 * SC-11: Automatic cleanup of expired CODEs
 *
 * This function should be called periodically to prevent memory buildup
 * from expired codes that were never exchanged.
 *
 * @returns Number of codes cleaned up
 *
 * @example
 * ```typescript
 * // Run cleanup periodically
 * const cleaned = await cleanupExpiredAuthCodes()
 * console.log(`Cleaned up ${cleaned} expired codes`)
 * ```
 */
export async function cleanupExpiredAuthCodes(): Promise<number> {
  const storage = useStorage('authCodeStore')
  const keys = await storage.getKeys()
  const now = Date.now()
  let cleanedCount = 0

  // CS-8: Process cleanup without blocking
  for (const key of keys) {
    const authCodeData = await storage.getItem<AuthCodeData>(key)

    if (!authCodeData) {
      continue
    }

    // CS-5: Remove expired codes
    if (now > authCodeData.expiresAt) {
      await storage.removeItem(key)
      cleanedCount++

      consola.debug('[Nuxt Aegis] Cleaned up expired authorization code:', `${key.substring(0, 8)}...`)
    }
  }

  if (cleanedCount > 0) {
    consola.info(`[Nuxt Aegis] Cleanup completed: ${cleanedCount} expired code(s) removed`)
  }

  return cleanedCount
}

/**
 * Get statistics about the authorization code store
 * Useful for monitoring and debugging
 *
 * @returns Statistics object with total, expired, and valid code counts
 *
 * @example
 * ```typescript
 * const stats = await getAuthCodeStats()
 * console.log(`Total: ${stats.total}, Valid: ${stats.valid}, Expired: ${stats.expired}`)
 * ```
 */
export async function getAuthCodeStats(): Promise<{
  total: number
  valid: number
  expired: number
}> {
  const storage = useStorage('authCodeStore')
  const keys = await storage.getKeys()
  const now = Date.now()
  let validCount = 0
  let expiredCount = 0

  for (const key of keys) {
    const authCodeData = await storage.getItem<AuthCodeData>(key)

    if (!authCodeData) {
      continue
    }

    if (now > authCodeData.expiresAt) {
      expiredCount++
    }
    else {
      validCount++
    }
  }

  return {
    total: keys.length,
    valid: validCount,
    expired: expiredCount,
  }
}
