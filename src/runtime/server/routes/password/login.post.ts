import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../../utils/logger'
import { useAegisHandler } from '../../utils/handler'
import {
  normalizeEmail,
  verifyPassword,
  obfuscateMagicCode,
} from '../../utils/password'
import { storeMagicCode } from '../../utils/magicCodeStore'

const logger = createLogger('PasswordLogin')

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
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  const normalizedEmail = normalizeEmail(email)

  // Find user
  const user = await handler.password.findUser(normalizedEmail)

  // Verify password
  let isValidPassword = false
  if (user) {
    isValidPassword = handler.password.verifyPassword
      ? await handler.password.verifyPassword(password, user.hashedPassword)
      : await verifyPassword(password, user.hashedPassword)
  }

  if (!user || !isValidPassword) {
    // Generic error to prevent enumeration
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  // Generate and store magic code
  const code = await storeMagicCode(
    normalizedEmail,
    'login',
    {},
    passwordConfig.magicCodeTTL,
    passwordConfig.magicCodeMaxAttempts,
  )

  logger.debug(`Magic code generated for ${normalizedEmail}: ${obfuscateMagicCode(code)}`)

  // Send verification code
  try {
    await handler.password.sendVerificationCode(normalizedEmail, code, 'login')
  }
  catch (error) {
    logger.error('Failed to send verification code', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to send verification code',
    })
  }

  return { success: true }
})
