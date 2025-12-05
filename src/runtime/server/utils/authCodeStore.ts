import { randomBytes } from 'node:crypto'
import { useStorage } from '#imports'
import type { H3Event } from 'h3'
import type { AuthCodeData } from '../../types'
import { createLogger } from './logger'

const logger = createLogger('AuthCode')

/**
 * Authorization Code Store Utilities
 *
 * Provides server-side storage and management for short-lived authorization CODEs
 * used in the OAuth 2.0 authorization code flow.
 *
 * Flow:
 * 1. Generate and store authorization CODE after OAuth authentication
 * 2. Store CODE with user info and provider tokens in memory
 * 3. Set 60-second expiration (configurable via CF-9)
 * 4. Retrieve and delete CODE when exchanging for tokens
 * 5. Ensure single-use by immediate deletion
 * 6. Automatic cleanup of expired CODEs
 *
 * Security Features:
 * - Cryptographically secure random CODE generation (crypto.randomBytes)
 * - Single-use enforcement (delete immediately after retrieval)
 * - Automatic cleanup of expired CODEs
 * - Validation before allowing token exchange
 */

/**
 * Generate a cryptographically secure authorization code
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
  logger.security('Authorization code generated', {
    timestamp: new Date().toISOString(),
    event: 'CODE_GENERATED',
    codePrefix: `${code.substring(0, 8)}...`,
  })

  return code
}

/**
 * Store authorization code with associated user and provider data
 * Server-side in-memory key-value store for temporary authorization CODE storage
 * Associate CODE with user information and provider tokens
 * Set expiration time of 60 seconds
 * Store CODE in server-side in-memory key-value store
 *
 * @param code - The authorization code to store
 * @param providerUserInfo - Complete OAuth provider user data
 * @param providerTokens - Tokens received from OAuth provider
 * @param providerTokens.access_token - Provider access token
 * @param providerTokens.refresh_token - Optional provider refresh token
 * @param providerTokens.id_token - Optional provider ID token
 * @param providerTokens.expires_in - Optional token expiration time
 * @param provider - Provider name (e.g., 'google', 'github', 'microsoft', 'auth0')
 * @param customClaims - Resolved custom claims (already processed from static or callback config)
 * @param expiresIn - Expiration time in seconds (default: 60)
 * @param _event - H3Event for Nitro storage access (optional, currently unused)
 *
 * @example
 * ```typescript
 * await storeAuthCode('X7k9mP...', providerUserInfo, providerTokens, 'google', customClaims)
 * ```
 */
export async function storeAuthCode(
  code: string,
  providerUserInfo: Record<string, unknown>,
  providerTokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  },
  provider: string,
  customClaims: Record<string, unknown> | undefined,
  expiresIn = 60, // CS-4: Default 60 seconds
  _event?: H3Event,
): Promise<void> {
  const now = Date.now()

  const authCodeData: AuthCodeData = {
    providerUserInfo,
    providerTokens,
    expiresAt: now + (expiresIn * 1000), // CS-4: Set expiration timestamp
    createdAt: now,
    provider,
    customClaims, // Store resolved custom claims
  }

  // CS-1: Store in server-side key-value store
  await useStorage('authCodeStore').setItem<AuthCodeData>(code, authCodeData)

  // Security event logging
  logger.security('Authorization code stored', {
    timestamp: new Date().toISOString(),
    event: 'CODE_STORED',
    codePrefix: `${code.substring(0, 8)}...`,
    expiresAt: new Date(authCodeData.expiresAt).toISOString(),
    expiresInSeconds: expiresIn,
  })
}

/**
 * Validate that an authorization code exists and has not expired
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
    logger.security('Authorization code not found', {
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
    logger.security('Authorization code expired', {
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
 * Immediately delete CODE after successful exchange for single-use enforcement
 * Prevent CODE reuse by validating existence before deletion
 * Ensure single-use only
 * Delete CODE from store after validation
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
    logger.security('Invalid authorization code exchange attempt', {
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
  logger.security('Authorization code successfully exchanged', {
    timestamp: new Date().toISOString(),
    event: 'CODE_EXCHANGE_SUCCESS',
    codePrefix: `${code.substring(0, 8)}...`,
    codeAge: Date.now() - authCodeData.createdAt,
  })

  return authCodeData
}

/**
 * Clean up expired authorization codes from storage
 * Automatically remove expired CODEs
 * Support automatic cleanup without blocking requests
 * Automatic cleanup of expired CODEs
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

      logger.debug('Cleaned up expired authorization code:', `${key.substring(0, 8)}...`)
    }
  }

  if (cleanedCount > 0) {
    logger.info(`Cleanup completed: ${cleanedCount} expired code(s) removed`)
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
