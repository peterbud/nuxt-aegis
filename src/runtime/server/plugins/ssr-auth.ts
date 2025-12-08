import { defineNitroPlugin } from 'nitropack/runtime'
import { getCookie } from 'h3'
import { hashRefreshToken, getRefreshTokenData } from '../utils/refreshToken'
import { generateToken } from '../utils/jwt'
import { processCustomClaims } from '../utils/customClaims'
import { useRuntimeConfig } from '#imports'
import type { TokenPayload, TokenConfig, CookieConfig, TokenRefreshConfig } from '../../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('SSR:Auth')

/**
 * Nitro server plugin for SSR authentication
 * Validates refresh token cookie and generates short-lived access tokens
 * for authenticated server-side rendering without rotating the refresh token
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async (event) => {
    const config = useRuntimeConfig(event)
    const authPath = config.public.nuxtAegis?.authPath || '/auth'
    const requestPath = event.node?.req?.url || event.path || ''

    // Skip SSR auth for:
    // 1. Auth routes (handled by their own endpoints)
    // 2. Static assets (_nuxt, favicon, etc.)
    // 3. API routes (should use Bearer tokens)
    if (
      requestPath.startsWith(authPath)
      || requestPath.startsWith('/_nuxt/')
      || requestPath.startsWith('/api/')
      || requestPath.includes('/favicon.ico')
      || requestPath.includes('/__')
    ) {
      return
    }

    logger.debug('SSR auth hook triggered for URL:', requestPath)

    // Skip if user already authenticated by auth middleware
    if (event.context.user) {
      logger.debug('SSR auth skipped: user already authenticated in context')
      return
    }

    // Only run if SSR authentication is enabled
    if (!config.public.nuxtAegis?.enableSSR) {
      return
    }

    const startTime = performance.now()

    const cookieConfig = config.nuxtAegis?.tokenRefresh?.cookie as CookieConfig | undefined
    const tokenConfig = config.nuxtAegis?.token as TokenConfig | undefined
    const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig | undefined

    if (!tokenConfig?.secret) {
      logger.debug('SSR auth skipped: token secret not configured')
      return
    }

    // Get refresh token from cookie
    const cookieName = cookieConfig?.cookieName || 'nuxt-aegis-refresh'
    const refreshToken = getCookie(event, cookieName)

    if (!refreshToken) {
      logger.debug('SSR auth skipped: no refresh token cookie found')
      return
    }

    try {
      // Hash and validate refresh token
      const hashedToken = hashRefreshToken(refreshToken)
      const storedRefreshToken = await getRefreshTokenData(hashedToken, event)

      // Validate token exists, not revoked, and not expired
      const isRevoked = storedRefreshToken?.isRevoked || false
      const isExpired = storedRefreshToken?.expiresAt ? (Date.now() > storedRefreshToken.expiresAt) : true

      if (!storedRefreshToken || isRevoked || isExpired) {
        logger.debug('SSR auth skipped: refresh token invalid, revoked, or expired')
        return
      }

      // Build user payload from stored data
      const providerUserInfo = storedRefreshToken.providerUserInfo
      const provider = storedRefreshToken.provider

      const userPayload: TokenPayload = {
        sub: String(providerUserInfo.sub || providerUserInfo.email || providerUserInfo.id || ''),
        email: providerUserInfo.email as string | undefined,
        name: providerUserInfo.name as string | undefined,
        picture: providerUserInfo.picture as string | undefined,
        provider,
      }

      // Process custom claims (same as /auth/refresh endpoint)
      let customClaims: Record<string, unknown> = {}
      const providerConfig = config.nuxtAegis?.providers?.[provider as 'google' | 'github' | 'microsoft' | 'auth0']

      if (providerConfig && 'customClaims' in providerConfig && providerConfig.customClaims) {
        // Type assertion needed because of the union type in provider config
        customClaims = await processCustomClaims(
          providerUserInfo,
          providerConfig.customClaims as Record<string, unknown> | ((info: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>),
        )
      }

      // Generate short-lived access token for SSR
      const ssrTokenExpiry = tokenRefreshConfig?.ssrTokenExpiry || '5m'
      const ssrAccessToken = await generateToken(
        userPayload,
        {
          ...tokenConfig,
          expiresIn: ssrTokenExpiry,
        },
        customClaims,
      )

      // Store in event context
      event.context.ssrAccessToken = ssrAccessToken
      event.context.user = userPayload

      const duration = Math.round(performance.now() - startTime)
      logger.debug(`SSR auth completed in ${duration}ms for user: ${userPayload.email}`)
    }
    catch (error) {
      // Silent failure - allows unauthenticated SSR
      logger.error('SSR auth failed:', error)
    }
  })
})
