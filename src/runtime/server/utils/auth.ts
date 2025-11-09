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
 * @param customClaims - Optional custom claims to add to the JWT (already processed)
 * @returns Object containing accessToken and refreshToken
 *
 * @example
 * ```typescript
 * const tokens = await generateAuthTokens(event, user, {
 *   role: 'admin',
 *   permissions: ['read', 'write'],
 * })
 * ```
 */
export async function generateAuthTokens(
  event: H3Event,
  user: Record<string, unknown>,
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
 * Type guard to assert that a route is protected and user is authenticated
 * Use this at the start of protected route handlers to narrow the type of event.context.user
 *
 * This function should be used in routes that are protected by the auth middleware.
 * It will throw a 401 error if the user is not authenticated (which should never happen
 * if the middleware is configured correctly, but provides a runtime safety check).
 *
 * @param event - H3Event object
 * @returns The event with user guaranteed to be present
 * @throws 401 Unauthorized if user is not authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler((event) => {
 *   const authenticatedEvent = requireAuth(event)
 *   const { user } = authenticatedEvent.context
 *   // TypeScript now knows user is defined, no need to check
 *   return { userId: user.sub, email: user.email }
 * })
 * ```
 */
export function requireAuth(event: H3Event): H3Event & { context: { user: TokenPayload } } {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return event as H3Event & { context: { user: TokenPayload } }
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
 */
export function getAuthUser(event: H3Event): TokenPayload {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return event.context.user
}
