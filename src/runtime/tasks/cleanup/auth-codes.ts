import { defineTask } from 'nitropack/runtime'
import { cleanupExpiredAuthCodes } from '../../server/utils/authCodeStore'

export default defineTask({
  meta: {
    name: 'cleanup:auth-codes',
    description: 'Clean up expired authorization codes from storage',
  },
  async run() {
    const deleted = await cleanupExpiredAuthCodes()
    return { result: { deleted } }
  },
})
