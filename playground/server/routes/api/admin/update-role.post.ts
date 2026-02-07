import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '#imports'
import { dbUpdateUser } from '../../../utils/db'
import type { AppTokenClaims } from '~~/shared/types/token'

/**
 * Admin endpoint to update user roles
 * This demonstrates how changing user data requires refresh({ updateClaims: true }) to reflect in JWT
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const authedEvent = requireAuth<AppTokenClaims>(event)
  const currentUser = authedEvent.context.user

  // For demo purposes, allow any authenticated user to update their own role
  // In production, you'd check if the user has admin permissions
  const { userId, role } = await readBody(event)

  if (!userId || !role) {
    throw createError({
      statusCode: 400,
      message: 'userId and role are required',
    })
  }

  // Validate role
  const validRoles = ['user', 'admin', 'moderator']
  if (!validRoles.includes(role)) {
    throw createError({
      statusCode: 400,
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    })
  }

  // For demo, allow users to update themselves
  // In production, add proper authorization checks
  if (userId !== currentUser.sub && currentUser.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only admins can update other users\' roles',
    })
  }

  // Update user in database
  const updatedUser = dbUpdateUser(userId, { role })

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  return {
    success: true,
    message: `Role updated to '${role}'. Call refresh({ updateClaims: true }) to refresh your JWT.`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    },
  }
})
