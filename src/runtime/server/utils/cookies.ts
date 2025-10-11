import { setCookie, deleteCookie } from 'h3'
import type { H3Event } from 'h3'
import type { CookieConfig } from '../../types'

/**
 * Set the authentication token as an HTTP-only cookie
 * @param event - H3Event object
 * @param token - JWT token to set as cookie
 * @param cookieConfig - Optional cookie configuration
 */
export function setRefreshTokenCookie(
  event: H3Event,
  token: string,
  cookieConfig?: CookieConfig,
): void {
  if (!token) {
    throw new Error('Token is required')
  }

  const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'
  const maxAge = cookieConfig?.maxAge || 604800 // 7 days default

  setCookie(event, cookieName, token, {
    httpOnly: cookieConfig?.httpOnly ?? true, // SC-3: Set HttpOnly flag
    secure: cookieConfig?.secure ?? (process.env.NODE_ENV === 'production'), // SC-4: Set Secure flag in production
    sameSite: cookieConfig?.sameSite || 'lax', // SC-5: Set SameSite attribute
    path: cookieConfig?.path || '/',
    domain: cookieConfig?.domain,
    maxAge,
  })
}

/**
 * Clear the authentication token cookie
 * @param event - H3Event object
 * @param cookieConfig - Optional cookie configuration
 */
export function clearToken(event: H3Event, cookieConfig?: CookieConfig): void {
  const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'
  deleteCookie(event, cookieName)
}
