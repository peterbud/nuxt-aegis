import type { H3Event } from 'h3'
import { getRequestURL, setCookie, deleteCookie } from 'h3'
import { SignJWT, jwtVerify } from 'jose'
import type { TokenConfig, SessionConfig, TokenPayload } from '../../types'
import { useRuntimeConfig } from '#imports'

export function getOAuthRedirectUri(event: H3Event): string {
  const requestURL = getRequestURL(event)

  return `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`
}

export async function generateToken(
  payload: TokenPayload,
  config: TokenConfig,
  customClaims?: Record<string, unknown>,
): Promise<string> {
  const secret = new TextEncoder().encode(config.secret)
  const expiresIn = config.expiresIn || '1h'

  // Reserved JWT claims that cannot be overridden
  const reservedClaims = ['iss', 'sub', 'exp', 'iat', 'nbf', 'jti', 'aud']

  // Merge custom claims, filtering out reserved ones
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
          console.warn(`Custom claim "${key}" has unsupported type and will be ignored`)
        }
      }
      else {
        console.warn(`Cannot override reserved JWT claim: ${key}`)
      }
    })
  }

  // Create JWT with standard claims
  let jwt = new SignJWT({ ...payload, ...safeClaims })
    .setProtectedHeader({ alg: config.algorithm || 'HS256' })
    .setIssuedAt()
    .setSubject(payload.sub)

  if (config.issuer) {
    jwt = jwt.setIssuer(config.issuer)
  }

  if (config.audience) {
    jwt = jwt.setAudience(config.audience)
  }

  if (typeof expiresIn === 'number') {
    jwt = jwt.setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
  }
  else {
    jwt = jwt.setExpirationTime(expiresIn)
  }

  return await jwt.sign(secret)
}

export async function updateTokenWithClaims(
  token: string,
  claims: Record<string, unknown>,
  config: TokenConfig,
): Promise<string> {
  const secret = new TextEncoder().encode(config.secret)

  const { payload } = await jwtVerify(token, secret)

  const updatedPayload: TokenPayload = {
    ...payload,
    ...claims,
    sub: payload.sub as string,
  }

  return await generateToken(updatedPayload, config)
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    return payload as TokenPayload
  }
  catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function clearToken(event: H3Event, sessionConfig?: SessionConfig): void {
  const cookieName = sessionConfig?.cookieName || 'nuxt-aegis-session'
  deleteCookie(event, cookieName, {
    httpOnly: sessionConfig?.httpOnly ?? true,
    secure: sessionConfig?.secure ?? (process.env.NODE_ENV === 'production'),
    sameSite: sessionConfig?.sameSite || 'lax',
    path: sessionConfig?.path || '/',
    domain: sessionConfig?.domain,
  })
}

export function setTokenCookie(
  event: H3Event,
  token: string,
  sessionConfig?: SessionConfig,
): void {
  const cookieName = sessionConfig?.cookieName || 'nuxt-aegis-session'
  const maxAge = sessionConfig?.maxAge || 604800 // 7 days default

  setCookie(event, cookieName, token, {
    httpOnly: sessionConfig?.httpOnly ?? true,
    secure: sessionConfig?.secure ?? (process.env.NODE_ENV === 'production'),
    sameSite: sessionConfig?.sameSite || 'lax',
    path: sessionConfig?.path || '/',
    domain: sessionConfig?.domain,
    maxAge,
  })
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
export async function generateAuthToken(
  event: H3Event,
  user: {
    sub?: string
    email?: string
    name?: string
    picture?: string
    [key: string]: unknown
  },
  customClaims?: Record<string, unknown>,
): Promise<string> {
  const config = useRuntimeConfig(event)
  const tokenConfig = config.nuxtAegis?.token as TokenConfig

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

  // Generate token with custom claims
  return await generateToken(payload, tokenConfig, customClaims)
}
