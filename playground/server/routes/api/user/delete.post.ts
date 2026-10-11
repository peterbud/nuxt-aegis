import { defineEventHandler, createError } from 'nuxt/server'
import { dbDeleteUser } from '../../../utils/db'
import type { AppTokenClaims } from '~~/shared/types/token'

export default defineEventHandler(async (event) => {
  // Get authenticated user from JWT token
  const user = getAuthUser<AppTokenClaims>(event)

  if (!user?.sub) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  const deleted = dbDeleteUser(user.sub)

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'User not found',
    })
  }

  return { success: true }
})
