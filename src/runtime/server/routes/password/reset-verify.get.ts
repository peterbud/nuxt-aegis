import { defineEventHandler, getQuery, createError, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createLogger } from '../../utils/logger'
import { validateAndIncrementAttempts, retrieveAndDeleteMagicCode } from '../../utils/magicCodeStore'
import { createResetSession } from '../../utils/resetSessionStore'

const logger = createLogger('PasswordResetVerify')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const passwordConfig = config.nuxtAegis?.providers?.password

  if (!passwordConfig) {
    throw createError({
      statusCode: 404,
      message: 'Password provider is not configured',
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

  if (magicCodeData.type !== 'reset') {
    throw createError({
      statusCode: 400,
      message: 'Invalid code type',
    })
  }

  const { email } = magicCodeData

  try {
    // Create reset session
    const sessionId = await createResetSession(email)

    // Delete magic code
    await retrieveAndDeleteMagicCode(code)

    // Redirect to password reset page with session ID
    // In a real app, you'd have a page for entering the new password
    const redirectUrl = `/reset-password?session=${sessionId}`

    return await sendRedirect(event, redirectUrl, 302)
  }
  catch (error) {
    logger.error('Reset verification failed', error)
    throw createError({
      statusCode: 500,
      message: 'Verification failed',
    })
  }
})
