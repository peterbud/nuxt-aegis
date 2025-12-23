import { dbDeleteUser } from '../../../utils/db'
import type { AppTokenClaims } from '~~/shared/types/token'

export default defineEventHandler(async (event) => {
  // Get authenticated user from JWT token
  const user = getAuthUser<AppTokenClaims>(event)

  if (!user?.sub) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const deleted = dbDeleteUser(user.sub)

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  return { success: true }
})
