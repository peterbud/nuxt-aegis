import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../../utils/logger'
import { useAegisHandler } from '../../utils/handler'
import { validateAndDeleteResetSession } from '../../utils/resetSessionStore'
import { validatePasswordStrength, hashPassword } from '../../utils/password'

const logger = createLogger('PasswordResetComplete')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const passwordConfig = config.nuxtAegis?.providers?.password

  if (!passwordConfig) {
    throw createError({
      statusCode: 404,
      message: 'Password provider is not configured',
    })
  }

  const handler = useAegisHandler()
  if (!handler?.password) {
    throw createError({
      statusCode: 500,
      message: 'Password handler is not implemented',
    })
  }

  const body = await readBody(event)
  const { sessionId, password } = body

  if (!sessionId || !password) {
    throw createError({
      statusCode: 400,
      message: 'Session ID and password are required',
    })
  }

  // Validate session
  const email = await validateAndDeleteResetSession(sessionId)
  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired reset session',
    })
  }

  // Validate password strength
  const passwordPolicy = passwordConfig.passwordPolicy || {}
  const passwordValidation = handler.password.validatePassword
    ? await handler.password.validatePassword(password)
    : validatePasswordStrength(password, passwordPolicy)

  if (passwordValidation !== true) {
    let errors: string[] = ['Invalid password']

    if (Array.isArray(passwordValidation)) {
      errors = passwordValidation
    }
    else if (typeof passwordValidation === 'object' && passwordValidation !== null && 'errors' in passwordValidation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors = (passwordValidation as any).errors
    }

    throw createError({
      statusCode: 400,
      message: 'Password does not meet requirements',
      data: { errors },
    })
  }

  try {
    // Hash password
    const hashedPassword = handler.password.hashPassword
      ? await handler.password.hashPassword(password)
      : await hashPassword(password)

    // Update user
    // We need to fetch the user first to get other fields if upsertUser requires them?
    // The interface says upsertUser(user: PasswordUser).
    // We only have email and hashedPassword.
    // If upsertUser is a full update, we might overwrite other fields.
    // So we should fetch first.
    const user = await handler.password.findUser(email)
    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found',
      })
    }

    await handler.password.upsertUser({
      ...user,
      hashedPassword,
    })

    // TODO: Revoke all sessions (refresh tokens)
    // This requires implementing deleteUserRefreshTokens in refreshToken.ts

    return { success: true }
  }
  catch (error) {
    logger.error('Password reset failed', error)
    throw createError({
      statusCode: 500,
      message: 'Password reset failed',
    })
  }
})
