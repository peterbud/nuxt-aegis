import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../../utils/logger'
import { useAegisHandler } from '../../utils/handler'
import { normalizeEmail, obfuscateMagicCode } from '../../utils/password'
import { storeMagicCode } from '../../utils/magicCodeStore'

const logger = createLogger('PasswordResetRequest')

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
  const { email } = body

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  const normalizedEmail = normalizeEmail(email)

  // Find user
  const user = await handler.password.findUser(normalizedEmail)

  // If user exists, send code
  if (user) {
    const code = await storeMagicCode(
      normalizedEmail,
      'reset',
      {},
      passwordConfig.magicCodeTTL,
      passwordConfig.magicCodeMaxAttempts,
    )

    logger.debug(`Magic code generated for ${normalizedEmail}: ${obfuscateMagicCode(code)}`)

    try {
      await handler.password.sendVerificationCode(normalizedEmail, code, 'reset')
    }
    catch (error) {
      // Log error but don't fail request to prevent enumeration
      logger.error('Failed to send verification code', error)
    }
  }
  else {
    // Simulate delay to prevent timing attacks?
    // For now, just log
    logger.debug(`Password reset requested for non-existent user: ${normalizedEmail}`)
  }

  // Always return success
  return { success: true, message: 'If an account exists with this email, a verification code has been sent.' }
})
