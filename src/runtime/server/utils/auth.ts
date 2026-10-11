import { useRuntimeConfig, createError } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import type { TokenConfig, BaseTokenClaims, TokenRefreshConfig } from '../../types'
import { generateAndStoreRefreshToken } from './refreshToken'
import { generateToken } from './jwt'

/**
 * Generate authentication tokens from user data with optional custom claims
 * This is the recommended way to generate tokens after successful OAuth authentication
 *
 * @param _event - RequestEvent object retained for caller compatibility
 * @param providerUserInfo - Complete user object from the OAuth provider (will be stored with refresh token)
 * @param provider - Provider name (e.g., 'google', 'github', 'microsoft', 'auth0')
 * @param customClaims - Optional custom claims to add to the JWT (already processed)
 * @returns Object containing accessToken and refreshToken
 *
 * @example
 * ```typescript
 * const tokens = await generateAuthTokens(event, providerUserInfo, 'google', {
 *   role: 'admin',
 *   permissions: ['read', 'write'],
 * })
 * ```
 */
export async function generateAuthTokens(
  _event: RequestEvent,
  providerUserInfo: Record<string, unknown>,
  provider: string,
  customClaims?: Record<string, unknown>,
): Promise<{ accessToken: string, refreshToken?: string }> {
  const config = useRuntimeConfig()
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  if (!tokenConfig || !tokenConfig.secret) {
    throw new Error('Token configuration is missing. Please configure nuxtAegis.token in your nuxt.config.ts')
  }

  // Build standard token payload from user object
  const payload: BaseTokenClaims = {
    sub: String(providerUserInfo.sub || providerUserInfo.email || providerUserInfo.id || ''),
    email: providerUserInfo.email as string | undefined,
    name: providerUserInfo.name as string | undefined,
    picture: providerUserInfo.picture as string | undefined,
    provider, // Include provider name in JWT payload
  }

  // EP-14, EP-14a: Generate and store refresh token with complete user object
  const refreshToken = await generateAndStoreRefreshToken(
    providerUserInfo, // RS-2: Store complete user object
    provider, // Store provider name for custom claims refresh
    tokenRefreshConfig,
    undefined, // No previous token hash for initial auth
    customClaims, // Store resolved custom claims for consistent refresh
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
 * @param event - RequestEvent object
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
 * type AppTokenClaims = CustomTokenClaims<{
 *   role: string
 *   permissions: string[]
 * }>
 *
 * export default defineEventHandler((event) => {
 *   const authedEvent = requireAuth<AppTokenClaims>(event)
 *   // TypeScript knows about role and permissions
 *   return { role: authedEvent.context.user.role }
 * })
 * ```
 */
export function requireAuth<T extends BaseTokenClaims = BaseTokenClaims>(
  event: RequestEvent,
): RequestEvent & { context: { user: T } } {
  if (!event.context.user) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return event as RequestEvent & { context: { user: T } }
}

/**
 * Get the authenticated user from the event context
 * This is a convenience function that combines requireAuth and context extraction
 *
 * @param event - RequestEvent object
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
 * export type AppTokenClaims = CustomTokenClaims<{
 *   role: string
 *   permissions: string[]
 * }>
 *
 * export default defineEventHandler((event) => {
 *   const user = getAuthUser<AppTokenClaims>(event)
 *   // TypeScript knows about role and permissions
 *   return { role: user.role, permissions: user.permissions }
 * })
 * ```
 */
export function getAuthUser<T extends BaseTokenClaims = BaseTokenClaims>(event: RequestEvent): T | null {
  if (!event.context.user) {
    return null
  }

  return event.context.user as T
}
