import { useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'
import type { TokenConfig, TokenPayload, TokenRefreshConfig } from '../../types'
import { generateAndStoreRefreshToken } from './refreshToken'
import { generateToken } from './jwt'

/**
 * Generate an authentication token from user data with optional custom claims
 * This is the recommended way to generate tokens after successful OAuth authentication
 *
 * @param event - H3Event object
 * @param user - User object from the OAuth provider with standard claims
 * @param user.sub - User's subject identifier
 * @param user.email - User's email address
 * @param user.name - User's full name
 * @param user.picture - User's profile picture URL
 * @param customClaims - Optional custom claims to add to the JWT
 * @returns Generated JWT token
 *
 * @example
 * ```typescript
 * const token = await generateAuthToken(event, user, {
 *   role: 'admin',
 *   permissions: ['read', 'write'],
 * })
 * ```
 */
export async function generateAuthTokens(
  event: H3Event,
  user: {
    sub?: string
    email?: string
    name?: string
    picture?: string
    [key: string]: unknown
  },
  customClaims?: Record<string, unknown>,
): Promise<{ accessToken: string, refreshToken?: string }> {
  const config = useRuntimeConfig(event)
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  if (!tokenConfig || !tokenConfig.secret) {
    throw new Error('Token configuration is missing. Please configure nuxtAegis.token in your nuxt.config.ts')
  }

  // Build standard token payload
  const payload: TokenPayload = {
    sub: user.sub || user.email || String(user.id || ''),
    email: user.email,
    name: user.name,
    picture: user.picture,
  }

  // Generate and store refresh token
  const refreshToken = await generateAndStoreRefreshToken(payload.sub, tokenRefreshConfig)

  // Generate token with custom claims
  return {
    accessToken: await generateToken(payload, tokenConfig, customClaims),
    refreshToken,
  }
}
