import {
  defineEventHandler,
  readBody,
  createError,
  getRequestHeader,
  isNuxtError,
  useRuntimeConfig,
} from 'nuxt/server'
import { verifyToken } from '../utils/jwt'
import { startImpersonation } from '../utils/impersonation'
import { createLogger } from '../utils/logger'

const logger = createLogger('Impersonate')

/**
 * POST /auth/impersonate
 * Allows privileged users (admins) to impersonate another user
 *
 * Request body:
 * - targetUserId: string (required) - The ID of the user to impersonate
 * - reason: string (optional) - Reason for impersonation
 *
 * Response:
 * - accessToken: string - JWT for impersonated session (no refresh token)
 *
 * Requirements:
 * - Impersonation feature must be enabled in config
 * - Requester must pass permission check (default: admin role)
 * - Target user must exist
 * - Cannot impersonate while already impersonating
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Check if impersonation feature is enabled
  if (!config.nuxtAegis?.impersonation?.enabled) {
    throw createError({
      status: 404,
      message: 'Impersonation feature is not enabled',
    })
  }

  try {
    // Get current user from auth header
    const authHeader = getRequestHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        status: 401,
        message: 'Authentication required',
      })
    }

    const token = authHeader.substring(7)
    const tokenConfig = config.nuxtAegis?.token

    if (!tokenConfig?.secret) {
      throw createError({
        status: 500,
        message: 'Token configuration is missing',
      })
    }

    // Verify current user's token
    const currentUser = await verifyToken(token, tokenConfig.secret)
    if (!currentUser) {
      throw createError({
        status: 401,
        message: 'Invalid or expired token',
      })
    }

    // Read request body
    const body = await readBody<{ targetUserId: string, reason?: string }>(event)

    if (!body || !body.targetUserId) {
      throw createError({
        status: 400,
        message: 'targetUserId is required',
      })
    }

    // Start impersonation
    const accessToken = await startImpersonation(
      currentUser,
      body.targetUserId,
      body.reason,
      event,
    )

    logger.security('Impersonation started', {
      admin: currentUser.sub,
      target: body.targetUserId,
      reason: body.reason,
    })

    return { accessToken }
  }
  catch (error: unknown) {
    logger.error('Impersonation failed:', error)

    if (isNuxtError(error)) {
      throw error
    }

    throw createError({
      status: 500,
      message: error instanceof Error ? error.message : 'Failed to start impersonation',
    })
  }
})
