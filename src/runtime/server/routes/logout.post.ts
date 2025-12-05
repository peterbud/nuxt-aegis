import { defineEventHandler, getCookie } from 'h3'
import { hashRefreshToken, revokeRefreshToken } from '../utils/refreshToken'
import { clearToken } from '../utils/cookies'
import { useRuntimeConfig } from '#imports'
import type { CookieConfig } from '../../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('Logout')

/**
 * POST /auth/logout
 * Ends the user session by clearing authentication cookies and revoking refresh token
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cookieConfig = config.nuxtAegis?.tokenRefresh?.cookie as CookieConfig

  try {
    // Get refresh token from cookie
    const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'
    const refreshToken = getCookie(event, cookieName)

    // RS-7: Revoke the refresh token if it exists
    if (refreshToken) {
      const hashedRefreshToken = hashRefreshToken(refreshToken)
      await revokeRefreshToken(hashedRefreshToken, event)
    }

    // EP-20: Clear refresh token cookie
    clearToken(event, cookieConfig)

    // EP-21: Return success response
    return { success: true, message: 'Logout successful' }
  }
  catch (error) {
    logger.error('Logout error:', error)

    // Still clear cookie and return success even if revocation fails
    clearToken(event, cookieConfig)
    return { success: true, message: 'Logout completed' }
  }
})
