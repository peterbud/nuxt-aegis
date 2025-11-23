import { dbDeleteUser } from '../../../utils/db'
import type { User } from '~~/shared/types/user'

export default defineEventHandler(async (event) => {
  const user = getAuthUser<User>(event)

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const deleted = dbDeleteUser(user.id)

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  return { success: true }
})
