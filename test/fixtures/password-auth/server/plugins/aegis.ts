import type { PasswordUser } from '../../../../../src/runtime/types/providers'
import { defineAegisHandler } from '../../../../../src/runtime/server/utils/handler'

// In-memory user store for testing
const users = new Map<string, PasswordUser>()
// Store sent codes for verification in tests - export so routes can access
export const sentCodes = new Map<string, string>()

export default defineNitroPlugin(() => {
  defineAegisHandler({
    onUserPersist: async (user) => {
      const email = user.email as string
      const hashedPassword = user.hashedPassword as string
      users.set(email, { email, hashedPassword })
      return {
        id: email, // Use email as ID for simplicity
        role: 'user',
      }
    },
    password: {
      findUser: async (email: string) => {
        return users.get(email) || null
      },
      sendVerificationCode: async (email: string, code: string, _action: 'register' | 'login' | 'reset') => {
        sentCodes.set(email, code)
      },
    },
  })
})
