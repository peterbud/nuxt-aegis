import { defineEventHandler } from 'h3'
import { useRuntimeConfig, clearToken } from '#imports'
import type { CookieConfig } from '../../types'

/**
 * POST /auth/logout
 * Ends the user session by clearing authentication cookies
 * EP-12: Clear all authentication cookies
 * EP-13: Return success response
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cookieConfig = config.nuxtAegis?.cookie as CookieConfig

  try {
    // EP-12: Clear authentication cookies using utility function
    clearToken(event, cookieConfig)

    // EP-13: Return success response
    return { success: true, message: 'Logout successful' }
  }
  catch (error) {
    console.error('[Nuxt Aegis] Logout error:', error)

    // Still return success even if cookie clearing fails
    return { success: true, message: 'Logout completed' }
  }
})
