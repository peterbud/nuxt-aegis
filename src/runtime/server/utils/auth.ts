import { useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { TokenConfig, TokenPayload, TokenRefreshConfig } from '../../types'
import { generateAndStoreRefreshToken } from './refreshToken'
import { generateToken } from './jwt'

/**
 * Generate authentication tokens from user data with optional custom claims
 * This is the recommended way to generate tokens after successful OAuth authentication
 *
 * EP-13, EP-14, EP-14a: Generates access token and refresh token, storing complete user object
 *
 * @param event - H3Event object
 * @param user - Complete user object from the OAuth provider (will be stored with refresh token)
 * @param provider - Provider name (e.g., 'google', 'github', 'microsoft', 'auth0')
 * @param customClaims - Optional custom claims to add to the JWT (already processed)
 * @returns Object containing accessToken and refreshToken
 *
 * @example
 * ```typescript
 * const tokens = await generateAuthTokens(event, user, 'google', {
 *   role: 'admin',
 *   permissions: ['read', 'write'],
 * })
 * ```
 */
export async function generateAuthTokens(
  event: H3Event,
  user: Record<string, unknown>,
  provider: string,
  customClaims?: Record<string, unknown>,
): Promise<{ accessToken: string, refreshToken?: string }> {
  const config = useRuntimeConfig(event)
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  if (!tokenConfig || !tokenConfig.secret) {
    throw new Error('Token configuration is missing. Please configure nuxtAegis.token in your nuxt.config.ts')
  }

  // Build standard token payload from user object
  const payload: TokenPayload = {
    sub: String(user.sub || user.email || user.id || ''),
    email: user.email as string | undefined,
    name: user.name as string | undefined,
    picture: user.picture as string | undefined,
  }

  // EP-14, EP-14a: Generate and store refresh token with complete user object
  const refreshToken = await generateAndStoreRefreshToken(
    user, // RS-2: Store complete user object
    provider, // Store provider name for custom claims refresh
    tokenRefreshConfig,
    undefined, // No previous token hash for initial auth
    event,
  )

  // EP-13: Generate access token with custom claims
  return {
    accessToken: await generateToken(payload, tokenConfig, customClaims),
    refreshToken,
  }
}

/**
 * Ensures the event has an authenticated user and narrows the type
 * Returns the event with narrowed context type for better type inference
 *
 * @param event - H3Event object
 * @returns Event with guaranteed user context
 * @throws 401 Unauthorized if user is not authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler((event) => {
 *   const authedEvent = requireAuth(event)
 *   // TypeScript knows authedEvent.context.user is defined
 *   return { userId: authedEvent.context.user.sub }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With custom claims typing
 * interface MyTokenPayload extends TokenPayload {
 *   role: string
 *   permissions: string[]
 * }
 *
 * export default defineEventHandler((event) => {
 *   const authedEvent = requireAuth<MyTokenPayload>(event)
 *   // TypeScript knows about role and permissions
 *   return { role: authedEvent.context.user.role }
 * })
 * ```
 */
export function requireAuth<T extends TokenPayload = TokenPayload>(
  event: H3Event,
): H3Event & { context: { user: T } } {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return event as H3Event & { context: { user: T } }
}

/**
 * Get the authenticated user from the event context
 * This is a convenience function that combines requireAuth and context extraction
 *
 * @param event - H3Event object
 * @returns The authenticated user payload
 * @throws 401 Unauthorized if user is not authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler((event) => {
 *   const user = getAuthUser(event)
 *   // TypeScript knows user is defined
 *   return { userId: user.sub, email: user.email }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With custom claims typing
 * interface MyTokenPayload extends TokenPayload {
 *   role: string
 *   permissions: string[]
 * }
 *
 * export default defineEventHandler((event) => {
 *   const user = getAuthUser<MyTokenPayload>(event)
 *   // TypeScript knows about role and permissions
 *   return { role: user.role, permissions: user.permissions }
 * })
 * ```
 */
export function getAuthUser<T extends TokenPayload = TokenPayload>(event: H3Event): T {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return event.context.user as T
}
