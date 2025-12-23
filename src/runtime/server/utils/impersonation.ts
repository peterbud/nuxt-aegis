import type { H3Event } from 'h3'
import { createError } from 'h3'
import type {
  BaseTokenClaims,
  ImpersonationContext,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
} from '../../types'
import { generateToken } from './jwt'
import { useRuntimeConfig } from '#imports'
import { useNitroApp } from 'nitropack/runtime'
import { createLogger } from './logger'
import { generateAndStoreRefreshToken } from './refreshToken'
import { useAegisHandler } from './handler'

const logger = createLogger('Impersonation')

/**
 * Check if impersonation feature is enabled
 * @throws 404 error if impersonation is disabled
 */
function checkImpersonationEnabled(): void {
  const config = useRuntimeConfig()
  if (!config.nuxtAegis?.impersonation?.enabled) {
    throw createError({
      statusCode: 404,
      message: 'Impersonation feature is not enabled',
    })
  }
}

/**
 * Extract client IP and user agent from request
 */
function getClientInfo(event: H3Event): { ip?: string, userAgent?: string } {
  const headers = event.node.req.headers
  const ip = (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || (headers['x-real-ip'] as string)
    || event.node.req.socket?.remoteAddress
  const userAgent = headers['user-agent'] as string

  return { ip, userAgent }
}

/**
 * Check if the requester is allowed to impersonate other users
 * @param requester - The user requesting impersonation
 * @param targetUserId - The ID of the user to impersonate
 * @param event - H3 event for context
 * @throws 403 error if impersonation is not allowed
 */
export async function checkImpersonationAllowed(
  requester: BaseTokenClaims,
  targetUserId: string,
  event: H3Event,
): Promise<void> {
  // Check if feature is enabled
  checkImpersonationEnabled()

  // Prevent impersonation chains (cannot impersonate while already impersonating)
  if (requester.impersonation) {
    throw createError({
      statusCode: 403,
      message: 'Cannot impersonate while already impersonating another user',
    })
  }

  const handler = useAegisHandler()

  // Use handler if defined
  if (handler?.impersonation?.canImpersonate) {
    const allowed = await handler.impersonation.canImpersonate(requester, targetUserId, event)
    if (!allowed) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions to impersonate users',
      })
    }
    return
  }

  // Default: check for admin role
  if (requester.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to impersonate users',
    })
  }
}

/**
 * Fetch target user data for impersonation
 * @param requester - The user requesting impersonation
 * @param targetUserId - The ID of the user to impersonate
 * @param event - H3 event for context
 * @returns User data object with sub, email, name, and custom claims
 * @throws 404 error if user not found
 * @throws 500 error if hook is not implemented
 */
export async function fetchTargetUser(
  requester: BaseTokenClaims,
  targetUserId: string,
  event: H3Event,
): Promise<Record<string, unknown>> {
  const handler = useAegisHandler()

  if (!handler?.impersonation?.fetchTarget) {
    throw createError({
      statusCode: 500,
      message: 'Impersonation requires implementing fetchTarget handler.',
    })
  }

  try {
    const targetUser = await handler.impersonation.fetchTarget(targetUserId, event)

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: `Target user not found: ${targetUserId}`,
      })
    }

    return targetUser
  }
  catch (error: unknown) {
    const err = error as { statusCode?: number, message?: string }
    if (err.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch target user',
    })
  }
}

/**
 * Generate an impersonated JWT token
 * @param requester - The user performing impersonation
 * @param targetUserData - Target user data from database
 * @param reason - Optional reason for impersonation
 * @param _event - H3 event for context
 * @returns JWT access token (no refresh token)
 */
export async function generateImpersonatedToken(
  requester: BaseTokenClaims,
  targetUserData: Record<string, unknown>,
  reason: string | undefined,
  _event: H3Event,
): Promise<string> {
  const config = useRuntimeConfig()
  const tokenConfig = config.nuxtAegis?.token
  const impersonationConfig = config.nuxtAegis?.impersonation

  if (!tokenConfig || !tokenConfig.secret) {
    throw createError({
      statusCode: 500,
      message: 'Token configuration is missing',
    })
  }

  // Create impersonation context with essential original user fields
  // Store all original user claims for restoration
  const originalClaims: Record<string, unknown> = {}
  const standardTokenFields = ['sub', 'id', 'email', 'name', 'picture', 'provider', 'iat', 'exp', 'iss', 'aud', 'impersonation']

  for (const [key, value] of Object.entries(requester)) {
    if (!standardTokenFields.includes(key)) {
      originalClaims[key] = value
    }
  }

  const impersonationContext: ImpersonationContext = {
    originalUserId: requester.sub,
    originalUserEmail: requester.email,
    originalUserName: requester.name,
    impersonatedAt: new Date().toISOString(),
    reason,
    originalClaims, // Store all custom claims for restoration
  }

  // Build token payload with target user's data
  const tokenPayload: BaseTokenClaims = {
    sub: (targetUserData.sub || targetUserData.id || targetUserData.email) as string,
    email: targetUserData.email as string | undefined,
    name: targetUserData.name as string | undefined,
    picture: targetUserData.picture as string | undefined,
    provider: targetUserData.provider as string | undefined,
    impersonation: impersonationContext,
  }

  // Include custom fields from target user data directly as claims
  // Filter out standard fields to avoid duplication
  const standardFields = ['sub', 'id', 'email', 'name', 'picture', 'provider', 'iat', 'exp', 'iss', 'aud']
  const customClaims: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(targetUserData)) {
    if (!standardFields.includes(key)) {
      customClaims[key] = value
    }
  }

  // Use shorter expiration time for impersonated sessions
  const impersonationExpiration = impersonationConfig?.tokenExpiration || 900 // 15 minutes default

  const modifiedTokenConfig = {
    ...tokenConfig,
    expiresIn: impersonationExpiration,
  }

  // Generate JWT with target user's data and impersonation context
  const accessToken = await generateToken(tokenPayload, modifiedTokenConfig, customClaims)

  logger.security('Impersonated token generated', {
    originalUser: requester.sub,
    targetUser: tokenPayload.sub,
    expiresIn: impersonationExpiration,
  })

  return accessToken
}

/**
 * Start impersonation session
 * @param requester - The user requesting impersonation (must be admin)
 * @param targetUserId - The ID of the user to impersonate
 * @param reason - Optional reason for impersonation
 * @param event - H3 event for context
 * @returns Access token for impersonated session (no refresh token)
 */
export async function startImpersonation(
  requester: BaseTokenClaims,
  targetUserId: string,
  reason: string | undefined,
  event: H3Event,
): Promise<string> {
  // 1. Check if impersonation is allowed
  await checkImpersonationAllowed(requester, targetUserId, event)

  // 2. Fetch target user data
  const targetUserData = await fetchTargetUser(requester, targetUserId, event)

  // 3. Generate impersonated token
  const accessToken = await generateImpersonatedToken(requester, targetUserData, reason, event)

  // 4. Emit audit hook (fire-and-forget, after successful token generation)
  const { ip, userAgent } = getClientInfo(event)

  const targetPayload: BaseTokenClaims = {
    sub: (targetUserData.sub || targetUserData.id || targetUserData.email) as string,
    email: targetUserData.email as string | undefined,
    name: targetUserData.name as string | undefined,
  }

  const startPayload: ImpersonateStartPayload = {
    requester,
    targetUser: targetPayload,
    reason,
    timestamp: new Date(),
    ip: ip || '',
    userAgent: userAgent || '',
    event,
  }

  // Fire-and-forget: log warnings if hook fails but don't block impersonation
  try {
    const nitroApp = useNitroApp()
    await nitroApp.hooks.callHook('nuxt-aegis:impersonate:start', startPayload)
  }
  catch (error: unknown) {
    logger.warn('Impersonation start hook failed (non-blocking)', error)
  }

  return accessToken
}

/**
 * End impersonation and restore original user session
 * @param currentToken - Current JWT token (must contain impersonation context)
 * @param event - H3 event for context
 * @returns Object with new access token and refresh token ID
 */
export async function endImpersonation(
  currentToken: BaseTokenClaims,
  event: H3Event,
): Promise<{ accessToken: string, refreshTokenId: string }> {
  // Check if feature is enabled
  checkImpersonationEnabled()

  // Validate that current token has impersonation context
  if (!currentToken.impersonation) {
    throw createError({
      statusCode: 400,
      message: 'Current session is not impersonated',
    })
  }

  const impersonation = currentToken.impersonation

  // Try to fetch fresh data for the original user
  // If fetch fails (user not in DB), fall back to stored context
  let originalUserData: Record<string, unknown> | null = null

  try {
    originalUserData = await fetchTargetUser(
      currentToken, // Pass current token as requester (for context)
      impersonation.originalUserId,
      event,
    )
  }
  catch (error: unknown) {
    const err = error as { statusCode?: number }
    // If user not found (404), use stored context
    if (err.statusCode === 404) {
      logger.warn('Original user not found in database, using stored context', {
        userId: impersonation.originalUserId,
      })
      // Will use stored context below
    }
    else {
      // Other errors should propagate
      throw error
    }
  }

  const config = useRuntimeConfig()
  const tokenConfig = config.nuxtAegis?.token

  if (!tokenConfig || !tokenConfig.secret) {
    throw createError({
      statusCode: 500,
      message: 'Token configuration is missing',
    })
  }

  // Build token payload for original user
  // Use fresh data if available, otherwise fall back to stored context
  const originalPayload: BaseTokenClaims = {
    sub: originalUserData
      ? ((originalUserData.sub || originalUserData.id || originalUserData.email) as string)
      : impersonation.originalUserId,
    email: originalUserData
      ? (originalUserData.email as string | undefined)
      : impersonation.originalUserEmail,
    name: originalUserData
      ? (originalUserData.name as string | undefined)
      : impersonation.originalUserName,
    picture: originalUserData?.picture as string | undefined,
    provider: (originalUserData?.provider || impersonation.originalClaims?.provider) as string | undefined,
  }

  // Include custom fields from original user data (only if we fetched fresh data)
  const standardFields = ['sub', 'id', 'email', 'name', 'picture', 'provider', 'iat', 'exp', 'iss', 'aud', 'impersonation']
  const customClaims: Record<string, unknown> = {}

  if (originalUserData) {
    // We have fresh data from database
    for (const [key, value] of Object.entries(originalUserData)) {
      if (!standardFields.includes(key)) {
        customClaims[key] = value
      }
    }
  }
  else if (impersonation.originalClaims) {
    // Fall back to stored original claims
    // Filter out provider since it's now in the main payload
    const filteredClaims = { ...impersonation.originalClaims }
    delete filteredClaims.provider
    Object.assign(customClaims, filteredClaims)
  }

  // Generate normal JWT with standard expiration
  const accessToken = await generateToken(originalPayload, tokenConfig, customClaims)

  // Generate refresh token for restored session
  const refreshTokenConfig = config.nuxtAegis?.tokenRefresh
  if (!refreshTokenConfig) {
    throw createError({
      statusCode: 500,
      message: 'Token refresh configuration is missing',
    })
  }

  const refreshTokenId = await generateAndStoreRefreshToken(
    originalUserData || { sub: originalPayload.sub, email: originalPayload.email, name: originalPayload.name }, // Store user data (fresh or fallback)
    'restored-session', // Fake provider name for restored sessions
    refreshTokenConfig,
    undefined, // No previous token
    customClaims, // Store custom claims for restored session
    event,
  )

  if (!refreshTokenId) {
    throw createError({
      statusCode: 500,
      message: 'Failed to generate refresh token',
    })
  }

  logger.security('Impersonation ended, original session restored', {
    originalUser: originalPayload.sub,
    wasImpersonating: currentToken.sub,
  })

  // Emit audit hook (fire-and-forget, after successful restoration)
  const { ip, userAgent } = getClientInfo(event)

  const endPayload: ImpersonateEndPayload = {
    restoredUser: originalPayload, // Restored original user
    impersonatedUser: currentToken, // Current impersonated user
    timestamp: new Date(),
    ip: ip || '',
    userAgent: userAgent || '',
    event,
  }

  // Fire-and-forget: log warnings if hook fails but don't block restoration
  try {
    const nitroApp = useNitroApp()
    await nitroApp.hooks.callHook('nuxt-aegis:impersonate:end', endPayload)
  }
  catch (error: unknown) {
    logger.warn('Impersonation end hook failed (non-blocking)', error)
  }

  return { accessToken, refreshTokenId }
}
