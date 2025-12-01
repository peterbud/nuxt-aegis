import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../../utils/logger'
import { useAegisHandler } from '../../utils/handler'
import {
  normalizeEmail,
  validateEmailFormat,
  validatePasswordStrength,
  hashPassword,
  obfuscateMagicCode,
} from '../../utils/password'
import { storeMagicCode } from '../../utils/magicCodeStore'

const logger = createLogger('PasswordRegister')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const passwordConfig = config.nuxtAegis?.providers?.password

  logger.debug('Register endpoint called')

  if (!passwordConfig) {
    logger.error('Password provider is not configured')
    throw createError({
      statusCode: 404,
      message: 'Password provider is not configured',
    })
  }

  const handler = useAegisHandler()
  if (!handler?.password) {
    logger.error('Password handler is not implemented')
    throw createError({
      statusCode: 500,
      message: 'Password handler is not implemented',
    })
  }

  const body = await readBody(event)
  logger.debug('Request body:', body)
  const { email, password } = body

  if (!email || !password) {
    logger.error('Email or password missing', { email: !!email, password: !!password })
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  // Normalize email
  const normalizedEmail = normalizeEmail(email)

  // Validate email format
  const emailValidation = validateEmailFormat(normalizedEmail)
  if (!emailValidation.valid) {
    throw createError({
      statusCode: 400,
      message: emailValidation.error,
    })
  }

  // Validate password strength
  const passwordPolicy = passwordConfig.passwordPolicy || {}
  const passwordValidation = handler.password.validatePassword
    ? await handler.password.validatePassword(password)
    : validatePasswordStrength(password, passwordPolicy)

  if (passwordValidation !== true) {
    const errors = Array.isArray(passwordValidation) ? passwordValidation : ['Invalid password']

    throw createError({
      statusCode: 400,
      message: 'Password does not meet requirements',
      data: { errors },
    })
  }

  // Check if user already exists
  const existingUser = await handler.password.findUser(normalizedEmail)
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'User already exists',
    })
  }

  // Hash password
  const hashedPassword = handler.password.hashPassword
    ? await handler.password.hashPassword(password)
    : await hashPassword(password)

  // Generate and store magic code
  const code = await storeMagicCode(
    normalizedEmail,
    'register',
    { hashedPassword },
    passwordConfig.magicCodeTTL,
    passwordConfig.magicCodeMaxAttempts,
  )

  logger.debug(`Magic code generated for ${normalizedEmail}: ${obfuscateMagicCode(code)}`)

  // Send verification code
  try {
    await handler.password.sendVerificationCode(normalizedEmail, code, 'register')
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
