import { defineEventHandler, createError } from 'nuxt/server'

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
    status: 401,
    statusText: 'Unauthorized',
    message: 'Authentication required',
  })
})
