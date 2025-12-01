import { defineEventHandler, readBody, createError, getHeader, getCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useAegisHandler } from '../../utils/handler'
import { verifyToken } from '../../utils/jwt'
import { verifyPassword, validatePasswordStrength, hashPassword, normalizeEmail } from '../../utils/password'
import { deleteUserRefreshTokens, hashRefreshToken } from '../../utils/refreshToken'

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

  // Authenticate user
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  const token = authHeader.substring(7)
  const tokenConfig = config.nuxtAegis?.token

  if (!tokenConfig?.secret) {
    throw createError({
      statusCode: 500,
      message: 'Token secret is not configured',
    })
  }

  const payload = await verifyToken(token, tokenConfig.secret).catch(() => {
    throw createError({
      statusCode: 401,
      message: 'Invalid token',
    })
  })

  if (!payload) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token payload',
    })
  }

  const email = payload.email as string
  if (!email) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token payload',
    })
  }

  const body = await readBody(event)
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      message: 'Current and new password are required',
    })
  }

  const normalizedEmail = normalizeEmail(email)

  // Find user
  const user = await handler.password.findUser(normalizedEmail)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // Verify current password
  const isValidPassword = handler.password.verifyPassword
    ? await handler.password.verifyPassword(currentPassword, user.hashedPassword)
    : await verifyPassword(currentPassword, user.hashedPassword)

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: 'Current password is incorrect',
    })
  }

  // Validate new password strength
  const passwordPolicy = passwordConfig.passwordPolicy || {}
  const passwordValidation = handler.password.validatePassword
    ? await handler.password.validatePassword(newPassword)
    : validatePasswordStrength(newPassword, passwordPolicy)

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
      message: 'New password does not meet requirements',
      data: { errors },
    })
  }

  // Hash new password
  const newHashedPassword = handler.password.hashPassword
    ? await handler.password.hashPassword(newPassword)
    : await hashPassword(newPassword)

  // Update user
  await handler.password.upsertUser({
    ...user,
    hashedPassword: newHashedPassword,
  })

  // Revoke other sessions
  // Get current refresh token from cookie to preserve it
  const refreshCookieName = config.nuxtAegis?.tokenRefresh?.cookie?.cookieName || 'nuxt-aegis-refresh'
  const currentRefreshToken = getCookie(event, refreshCookieName)
  let currentTokenHash
  if (currentRefreshToken) {
    currentTokenHash = hashRefreshToken(currentRefreshToken)
  }

  await deleteUserRefreshTokens(normalizedEmail, currentTokenHash, event)

  return { success: true }
})
