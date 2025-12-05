import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { RefreshTokenData, TokenRefreshConfig, EncryptionConfig } from '../../types'
import { useStorage, useRuntimeConfig } from '#imports'

/**
 * Hash a refresh token using SHA-256
 * @param token - The refresh token to hash
 * @returns The hashed token as a hex string
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - Encryption key (must be 32 bytes for AES-256)
 * @returns Encrypted data as base64 string with IV prepended
 */
export function encryptData(data: unknown, key: string): string {
  // Ensure key is 32 bytes for AES-256
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32))

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12)

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv)

  // Encrypt data
  const jsonData = JSON.stringify(data)
  let encrypted = cipher.update(jsonData, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  // Get auth tag
  const authTag = cipher.getAuthTag()

  // Combine IV + authTag + encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ])

  return combined.toString('base64')
}

/**
 * Decrypt data using AES-256-GCM
 * @param encrypted - Encrypted data as base64 string
 * @param key - Encryption key (must be 32 bytes for AES-256)
 * @returns Decrypted data
 */
export function decryptData(encrypted: string, key: string): unknown {
  try {
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32))

    // Decode combined data
    const combined = Buffer.from(encrypted, 'base64')

    // Extract IV (12 bytes), authTag (16 bytes), and encrypted data
    const iv = combined.subarray(0, 12)
    const authTag = combined.subarray(12, 28)
    const encryptedData = combined.subarray(28)

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    let decrypted = decipher.update(encryptedData.toString('base64'), 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted)
  }
  catch {
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Get encryption config from runtime config
 * @param event - H3 event (optional, for server context)
 * @returns Encryption configuration
 */
export function getEncryptionConfig(event?: H3Event): EncryptionConfig {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  return config.nuxtAegis?.tokenRefresh?.encryption || { enabled: false }
}

/**
 * Store refresh token data in persistent storage
 * Handles encryption transparently if enabled
 * @param tokenHash - Hashed refresh token (used as storage key)
 * @param data - Refresh token data to store
 * @param event - H3 event for runtime config access
 */
export async function storeRefreshTokenData(
  tokenHash: string,
  data: RefreshTokenData,
  event?: H3Event,
): Promise<void> {
  const encryptionConfig = getEncryptionConfig(event)

  let dataToStore: RefreshTokenData | { encrypted: string }

  // SC-16, SC-17: Encrypt data if encryption is enabled
  if (encryptionConfig.enabled) {
    if (!encryptionConfig.key) {
      throw new Error('[Nuxt Aegis] Encryption is enabled but no encryption key is configured')
    }

    // Encrypt the entire data object
    const encrypted = encryptData(data, encryptionConfig.key)
    dataToStore = { encrypted } as unknown as RefreshTokenData
  }
  else {
    dataToStore = data
  }

  // Store in Nitro storage
  await useStorage('refreshTokenStore').setItem(`${tokenHash}`, dataToStore)
}

/**
 * Retrieve refresh token data from persistent storage
 * Handles decryption transparently if enabled
 * @param tokenHash - Hashed refresh token (storage key)
 * @param event - H3 event for runtime config access
 * @returns Refresh token data or null if not found
 */
export async function getRefreshTokenData(
  tokenHash: string,
  event?: H3Event,
): Promise<RefreshTokenData | null> {
  const encryptionConfig = getEncryptionConfig(event)

  const storedData = await useStorage('refreshTokenStore').getItem<RefreshTokenData | { encrypted: string }>(`${tokenHash}`)

  if (!storedData) {
    return null
  }

  // SC-20: Decrypt data if it's encrypted
  if ('encrypted' in storedData && typeof storedData.encrypted === 'string') {
    if (!encryptionConfig.key) {
      throw new Error('[Nuxt Aegis] Data is encrypted but no encryption key is configured')
    }

    return decryptData(storedData.encrypted, encryptionConfig.key) as RefreshTokenData
  }

  return storedData as RefreshTokenData
}

/**
 * Delete refresh token data from storage
 * @param tokenHash - Hashed refresh token (storage key)
 */
export async function deleteRefreshTokenData(
  tokenHash: string,
): Promise<void> {
  await useStorage('refreshTokenStore').removeItem(`${tokenHash}`)
}

/**
 * Revoke a refresh token (mark as revoked without deleting)
 * @param tokenHash - Hashed refresh token (storage key)
 * @param event - H3 event for runtime config access
 */
export async function revokeRefreshToken(
  tokenHash: string,
  event?: H3Event,
): Promise<void> {
  const data = await getRefreshTokenData(tokenHash, event)

  if (!data) {
    // Token doesn't exist, nothing to revoke
    return
  }

  // Mark as revoked
  data.isRevoked = true

  // Store updated data
  await storeRefreshTokenData(tokenHash, data, event)
}

/**
 * Generates a refresh token and stores it with user data
 *
 * @param providerUserInfo - Complete OAuth provider user data
 * @param provider - Provider name (e.g., 'google', 'github', 'microsoft', 'auth0')
 * @param config - Token refresh configuration
 * @param previousTokenHash - Hash of previous refresh token for rotation tracking
 * @param event - H3Event for Nitro storage access
 * @returns The generated refresh token string
 */
export async function generateAndStoreRefreshToken(
  providerUserInfo: Record<string, unknown>,
  provider: string,
  config: TokenRefreshConfig,
  previousTokenHash?: string,
  event?: H3Event,
): Promise<string | undefined> {
  const refreshToken = randomBytes(32).toString('base64url')

  const expiresIn = config.cookie?.maxAge || 604800

  // RS-2, RS-3, RS-4: Store complete user object with metadata
  await storeRefreshTokenData(hashRefreshToken(refreshToken), {
    sub: String(providerUserInfo.sub || providerUserInfo.email || providerUserInfo.id || ''),
    expiresAt: Date.now() + (expiresIn * 1000),
    isRevoked: false,
    previousTokenHash,
    providerUserInfo, // Store complete OAuth provider user data
    provider, // Store provider name for custom claims refresh
  }, event)

  return refreshToken
}

/**
 * Delete all refresh tokens for a specific user
 * Used during password change or account deletion
 * @param email - User email to match
 * @param exceptTokenHash - Optional token hash to preserve (e.g. current session)
 * @param event - H3 event for runtime config access
 */
export async function deleteUserRefreshTokens(
  email: string,
  exceptTokenHash?: string,
  event?: H3Event,
): Promise<void> {
  const storage = useStorage('refreshTokenStore')
  const keys = await storage.getKeys()
  const normalizedEmail = email.toLowerCase()

  for (const key of keys) {
    // key is the tokenHash
    if (key === exceptTokenHash) continue

    const data = await getRefreshTokenData(key, event)
    if (!data) continue

    const userEmail = (data.providerUserInfo?.email as string)?.toLowerCase()

    if (userEmail === normalizedEmail) {
      await deleteRefreshTokenData(key)
    }
  }
}
