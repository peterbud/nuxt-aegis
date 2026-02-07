import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '#imports'
import { dbUpdateUser } from '../../../utils/db'
import type { AppTokenClaims } from '~~/shared/types/token'

/**
 * Admin endpoint to update user permissions
 * This demonstrates how changing user data requires refresh({ updateClaims: true }) to reflect in JWT
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const authedEvent = requireAuth<AppTokenClaims>(event)
  const currentUser = authedEvent.context.user

  const { userId, permissions } = await readBody(event)

  if (!userId || !permissions || !Array.isArray(permissions)) {
    throw createError({
      statusCode: 400,
      message: 'userId and permissions array are required',
    })
  }

  // Validate permissions
  const validPermissions = ['read', 'write', 'delete', 'admin']
  const invalidPerms = permissions.filter(p => !validPermissions.includes(p))
  if (invalidPerms.length > 0) {
    throw createError({
      statusCode: 400,
      message: `Invalid permissions: ${invalidPerms.join(', ')}. Valid: ${validPermissions.join(', ')}`,
    })
  }

  // For demo, allow users to update themselves
  // In production, add proper authorization checks
  if (userId !== currentUser.sub && currentUser.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only admins can update other users\' permissions',
    })
  }

  // Update user in database
  const updatedUser = dbUpdateUser(userId, { permissions })

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  return {
    success: true,
    message: `Permissions updated to [${permissions.join(', ')}]. Call refresh({ updateClaims: true }) to refresh your JWT.`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      permissions: updatedUser.permissions,
    },
  }
})
