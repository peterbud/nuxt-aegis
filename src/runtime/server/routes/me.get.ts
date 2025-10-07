import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  // Return the user context if it exists (set by auth middleware)
  if (event.context.user) {
    return event.context.user
  }
  // Return null or empty object if no user context
  return null
})
