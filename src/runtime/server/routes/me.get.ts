import { defineEventHandler, createError } from 'h3'

/**
 * GET /api/user/me
 * Returns the current authenticated user's information
 */
export default defineEventHandler(async (event) => {
  // EP-16: Return the user context if it exists (set by auth middleware)
  if (event.context.user) {
    return event.context.user
  }

  // EP-17: Return 401 if no user context (no valid JWT)
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: 'Authentication required',
  })
})
