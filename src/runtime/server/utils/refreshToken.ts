import { createHash, randomBytes } from 'node:crypto'
import type { RefreshTokenData, TokenRefreshConfig } from '../../types'
import { useStorage } from '#imports'

/**
 * Hash a refresh token using SHA-256
 * @param token - The refresh token to hash
 * @returns The hashed token as a hex string
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a refresh token and store it in the server-side storage
 * @param sub - Subject identifier for the user
 * @param tokenRefreshConfig - Refresh token configuration including expiration settings
 * @returns Generated refresh token
 */
export async function generateAndStoreRefreshToken(
  sub: string,
  tokenRefreshConfig: TokenRefreshConfig,
  previousTokenHash?: string,
): Promise<string> {
  const refreshToken = randomBytes(32).toString('base64url')

  const expiresIn = tokenRefreshConfig.cookie?.maxAge || 604800

  await useStorage('refreshTokenStore').setItem<RefreshTokenData>(hashRefreshToken(refreshToken), {
    sub,
    expiresAt: Date.now() + (expiresIn * 1000),
    isRevoked: false,
    previousTokenHash,
  })

  return refreshToken
}
