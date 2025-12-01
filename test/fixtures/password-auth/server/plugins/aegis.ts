import type { PasswordUser } from '../../../../../src/runtime/types/providers'
import { defineAegisHandler } from '../../../../../src/runtime/server/utils/handler'

// In-memory user store for testing
const users = new Map<string, PasswordUser>()
// Store sent codes for verification in tests - export so routes can access
export const sentCodes = new Map<string, string>()

export default defineNitroPlugin(() => {
  defineAegisHandler({
    password: {
      findUser: async (email: string) => {
        return users.get(email) || null
      },
      upsertUser: async (user: PasswordUser) => {
        users.set(user.email, user)
      },
      sendVerificationCode: async (email: string, code: string, _action: 'register' | 'login' | 'reset') => {
        sentCodes.set(email, code)
      },
    },
  })
})
