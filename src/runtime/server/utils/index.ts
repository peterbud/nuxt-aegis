import type { H3Event } from 'h3'
import { getRequestURL, setCookie, deleteCookie } from 'h3'
import { decodeJwt, jwtVerify, SignJWT } from 'jose'
import type { CookieConfig, RefreshTokenData, TokenConfig, TokenPayload, TokenRefreshConfig } from '../../types'
import { useRuntimeConfig, useStorage } from '#imports'
import { createHash, randomBytes } from 'node:crypto'

/**
 * Get OAuth redirect URI from the current request
 * @param event - H3Event object
 * @returns Full redirect URI including protocol, host and pathname
 */
export function getOAuthRedirectUri(event: H3Event): string {
  const requestURL = getRequestURL(event)
  return `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`
}

/**
 * Hash a refresh token using SHA-256
 * @param token - The refresh token to hash
 * @returns The hashed token as a hex string
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a JWT token with the given payload and custom claims
 * @param payload - Base token payload containing user information
 * @param config - Token configuration including secret and expiration
 * @param customClaims - Optional custom claims to add to the token
 * @returns Signed JWT token
 */
export async function generateToken(
  payload: TokenPayload,
  config: TokenConfig,
  customClaims?: Record<string, unknown>,
): Promise<string> {
  if (!config.secret) {
    throw new Error('Token secret is required')
  }

  const secret = new TextEncoder().encode(config.secret)
  const expiresIn = config.expiresIn || '1h'

  // JT-12: Reserved JWT claims that cannot be overridden
  const reservedClaims = ['iss', 'sub', 'exp', 'iat', 'nbf', 'jti', 'aud']

  // JT-13: Merge custom claims, filtering out reserved ones
  const safeClaims: Record<string, unknown> = {}
  if (customClaims) {
    Object.entries(customClaims).forEach(([key, value]) => {
      if (!reservedClaims.includes(key)) {
        // Validate claim value types (primitive types and arrays)
        if (
          typeof value === 'string'
          || typeof value === 'number'
          || typeof value === 'boolean'
          || Array.isArray(value)
          || value === null
        ) {
          safeClaims[key] = value
        }
        else {
          console.warn(`[Nuxt Aegis] Custom claim "${key}" has unsupported type and will be ignored`)
        }
      }
      else {
        console.warn(`[Nuxt Aegis] Cannot override reserved JWT claim: ${key}`)
      }
    })
  }

  // Create JWT with standard claims
  let jwt = new SignJWT({ ...payload, ...safeClaims })
    .setProtectedHeader({ alg: config.algorithm || 'HS256' })
    .setIssuedAt() // JT-8: Include iat (issued at) claim
    .setSubject(payload.sub) // JT-6: Include sub (subject) claim

  // JT-5: Include iss (issuer) claim if configured
  if (config.issuer) {
    jwt = jwt.setIssuer(config.issuer)
  }

  // JT-9: Include aud (audience) claim if configured
  if (config.audience) {
    jwt = jwt.setAudience(config.audience)
  }

  // JT-7: Include exp (expiration time) claim
  if (typeof expiresIn === 'number') {
    jwt = jwt.setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
  }
  else {
    jwt = jwt.setExpirationTime(expiresIn)
  }

  return await jwt.sign(secret)
}

/**
 * Update an existing JWT token with additional claims
 * @param token - Existing JWT token to update
 * @param claims - Additional claims to merge into the token
 * @param config - Token configuration
 * @returns New JWT token with updated claims
 */
export async function updateTokenWithClaims(
  token: string,
  claims: Record<string, unknown>,
  config: TokenConfig,
): Promise<string> {
  if (!config.secret) {
    throw new Error('Token secret is required')
  }

  const secret = new TextEncoder().encode(config.secret)
  const { payload } = await jwtVerify(token, secret)

  const updatedPayload: TokenPayload = {
    ...payload,
    ...claims,
    sub: payload.sub as string,
  }

  return await generateToken(updatedPayload, config)
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @param secret - Secret key used to sign the token
 * @returns Decoded token payload or null if verification fails
 */
export async function verifyToken(
  token: string,
  secret: string,
  checkExpiration: boolean = true,
): Promise<TokenPayload | null> {
  if (!token || !secret) {
    return null
  }

  try {
    const secretKey = new TextEncoder().encode(secret)
    if (checkExpiration) {
      const { payload } = await jwtVerify(token, secretKey)
      return payload as TokenPayload
    }
    else {
      // Decode without verifying expiration

      // First decode to get the payload
      const payload = decodeJwt(token) as TokenPayload

      const beforeExpiry = new Date((payload.exp || Date.now()) - 1000)
      await jwtVerify(token, secretKey, { currentDate: beforeExpiry })
      return payload as TokenPayload
    }
  }
  catch {
    if (import.meta.dev) {
      console.error('[Nuxt Aegis] Token verification failed')
    }
    return null
  }
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
 * Generate a refresh token and store it in the server-side storage
 * @param sub - Subject identifier for the user
 * @param tokenRefreshConfig - Refresh token configuration including expiration settings
 * @returns Generated refresh token
 */
export async function generateAndStoreRefreshToken(
  sub: string,
  tokenRefreshConfig: TokenRefreshConfig,
  previousTokenHash?: string,
): Promise<string> {
  const refreshToken = randomBytes(32).toString('base64url')

  const expiresIn = tokenRefreshConfig.cookie?.maxAge || 604800

  await useStorage('refreshTokenStore').setItem<RefreshTokenData>(hashRefreshToken(refreshToken), {
    sub,
    expiresAt: Date.now() + (expiresIn * 1000),
    isRevoked: false,
    previousTokenHash,
  })

  return refreshToken
}

/**
 * Generate an authentication token from user data with optional custom claims
 * This is the recommended way to generate tokens after successful OAuth authentication
 *
 * @param event - H3Event object
 * @param user - User object from the OAuth provider with standard claims
 * @param user.sub - User's subject identifier
 * @param user.email - User's email address
 * @param user.name - User's full name
 * @param user.picture - User's profile picture URL
 * @param customClaims - Optional custom claims to add to the JWT
 * @returns Generated JWT token
 *
 * @example
 * ```typescript
 * const token = await generateAuthToken(event, user, {
 *   role: 'admin',
 *   permissions: ['read', 'write'],
 * })
 * ```
 */
export async function generateAuthTokens(
  event: H3Event,
  user: {
    sub?: string
    email?: string
    name?: string
    picture?: string
    [key: string]: unknown
  },
  customClaims?: Record<string, unknown>,
): Promise<{ accessToken: string, refreshToken?: string }> {
  const config = useRuntimeConfig(event)
  const tokenConfig = config.nuxtAegis?.token as TokenConfig
  const tokenRefreshConfig = config.nuxtAegis?.tokenRefresh as TokenRefreshConfig

  if (!tokenConfig || !tokenConfig.secret) {
    throw new Error('Token configuration is missing. Please configure nuxtAegis.token in your nuxt.config.ts')
  }

  // Build standard token payload
  const payload: TokenPayload = {
    sub: user.sub || user.email || String(user.id || ''),
    email: user.email,
    name: user.name,
    picture: user.picture,
  }

  // Generate and store refresh token
  const refreshToken = await generateAndStoreRefreshToken(payload.sub, tokenRefreshConfig)

  // Generate token with custom claims
  return {
    accessToken: await generateToken(payload, tokenConfig, customClaims),
    refreshToken,
  }
}
