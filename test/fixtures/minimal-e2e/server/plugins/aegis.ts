/**
 * Minimal Aegis server plugin demonstrating onUserPersist.
 *
 * Uses an in-memory Map as a mock "database" to store
 * and enrich users on login — the same pattern a real app
 * would use with a real database.
 */
import { defineAegisHandler } from '../../../../../src/runtime/server/utils/handler'

// Simple in-memory user store
const users = new Map<string, Record<string, unknown>>()

export default defineNitroPlugin(() => {
  defineAegisHandler({
    onUserPersist: async (user, { provider }) => {
      const email = user.email as string

      // Store / update user in our "database"
      const existing = users.get(email)
      const dbUser = {
        ...existing,
        ...user,
        provider,
        lastLogin: new Date().toISOString(),
      }
      users.set(email, dbUser)

      // Return enriched data that gets merged into the JWT
      return {
        id: email,
        role: 'member',
      }
    },
  })
})
