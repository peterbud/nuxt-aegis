import { decodeJwt, jwtVerify, SignJWT } from 'jose'
import type { TokenConfig, TokenPayload } from '../../types'
import { filterReservedClaims, validateClaimTypes } from './customClaims'
import { createLogger } from './logger'

const logger = createLogger('JWT')

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

  // JT-12, JT-13: Filter and validate custom claims
  let safeClaims: Record<string, unknown> = {}
  if (customClaims) {
    const filtered = filterReservedClaims(customClaims)
    safeClaims = validateClaimTypes(filtered)
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
    logger.error('Token verification failed')
    return null
  }
}
