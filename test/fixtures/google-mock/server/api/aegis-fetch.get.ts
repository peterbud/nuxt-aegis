import { randomUUID } from 'node:crypto'
import { defineEventHandler, getQuery } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const authenticatedEvent = requireAuth(event)
  return {
    email: authenticatedEvent.context.user.email,
    label: String(getQuery(event).label || 'initial'),
    requestId: randomUUID(),
  }
})
