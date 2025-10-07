import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { clearToken } from '../utils'
import type { SessionConfig } from '../../types'

/**
 * POST /api/user/logout
 * Ends the user session by clearing authentication cookies
 * EP-12: Clear all authentication cookies
 * EP-13: Return success response
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const sessionConfig = config.nuxtAegis?.session as SessionConfig

  try {
    // EP-12: Clear authentication cookies using utility function
    clearToken(event, sessionConfig)

    // EP-13: Return success response
    return { success: true, message: 'Logout successful' }
  }
  catch (error) {
    if (import.meta.dev) {
      console.error('[Nuxt Aegis] Logout error:', error)
    }

    // Still return success even if cookie clearing fails
    return { success: true, message: 'Logout completed' }
  }
})
