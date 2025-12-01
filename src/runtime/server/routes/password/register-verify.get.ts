import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../../utils/logger'
import { useAegisHandler } from '../../utils/handler'
import { validateAndIncrementAttempts, retrieveAndDeleteMagicCode } from '../../utils/magicCodeStore'
import { storeAuthCode, generateAuthCode } from '../../utils/authCodeStore'

const logger = createLogger('PasswordRegisterVerify')

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

  const query = getQuery(event)
  const code = query.code as string

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Verification code is required',
    })
  }

  // Validate code
  const magicCodeData = await validateAndIncrementAttempts(code)
  if (!magicCodeData) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired code',
    })
  }

  if (magicCodeData.type !== 'register') {
    throw createError({
      statusCode: 400,
      message: 'Invalid code type',
    })
  }

  const { email, hashedPassword } = magicCodeData

  if (!hashedPassword) {
    throw createError({
      statusCode: 500,
      message: 'Invalid code data',
    })
  }

  try {
    // Persist user
    await handler.password.upsertUser({
      email,
      hashedPassword: hashedPassword as string,
    })

    // Retrieve user to get ID and other fields
    const user = await handler.password.findUser(email)
    if (!user) {
      throw new Error('User not found after creation')
    }

    // Delete magic code
    await retrieveAndDeleteMagicCode(code)

    // Prepare provider user info
    const providerUserInfo = {
      sub: user.id || user.email,
      provider: 'password',
      ...user,
    }

    // Generate Aegis CODE
    const authCode = generateAuthCode()
    await storeAuthCode(
      authCode,
      providerUserInfo,
      { access_token: 'password_auth' },
      'password',
      undefined,
      60,
      event,
    )

    // Redirect to callback
    const redirectUrl = `/auth/callback?code=${authCode}`

    return await sendRedirect(event, redirectUrl, 302)
  }
  catch (error) {
    logger.error('Registration verification failed', error)
    throw createError({
      statusCode: 500,
      message: 'Registration failed',
    })
  }
})
