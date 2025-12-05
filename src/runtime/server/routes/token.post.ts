import { defineEventHandler, readBody, createError } from 'h3'
import { retrieveAndDeleteAuthCode } from '../utils/authCodeStore'
import { useRuntimeConfig } from '#imports'
import { generateAuthTokens } from '../utils/auth'
import { setRefreshTokenCookie } from '../utils/cookies'
import type { TokenExchangeRequest, TokenExchangeResponse } from '../../types'
import { createLogger } from '../utils/logger'

const logger = createLogger('TokenExchange')

/**
 * POST /auth/token
 * Token Exchange Endpoint - Authorization CODE to JWT Tokens
 *
 * This endpoint implements the second step of the OAuth 2.0 authorization code flow.
 * It exchanges a short-lived authorization CODE for application-specific JWT tokens.
 *
 * Flow:
 * 1. Accept authorization CODE from request body
 * 2. Validate CODE exists in server-side key-value store
 * 3. Retrieve and delete CODE atomically (single-use enforcement)
 * 4. Generate JWT access token and refresh token
 * 5. Return access token in JSON response body
 * 6. Set refresh token as HttpOnly, Secure cookie
 *
 * Security:
 * - Single-use CODE enforcement via immediate deletion
 * - Generic 401 error for invalid/expired/reused CODEs
 * - No specific failure reasons revealed to prevent information leakage
 *
 * @returns TokenExchangeResponse with access token and metadata
 * @throws 400 Bad Request if CODE is missing from request body
 * @throws 401 Unauthorized if CODE is invalid, expired, or already used (EH-4: Generic error)
 * @throws 500 Internal Server Error if token generation fails
 */
export default defineEventHandler(async (event) => {
  // EP-10: Accept CODE from request body
  const body = await readBody<TokenExchangeRequest>(event)

  if (!body?.code) {
    // Security event logging - missing code
    logger.security('Token exchange attempted without authorization code', {
      timestamp: new Date().toISOString(),
      event: 'TOKEN_EXCHANGE_MISSING_CODE',
      severity: 'warning',
    })

    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing authorization code',
    })
  }

  // EP-11, EP-12: Retrieve and delete CODE atomically
  // This ensures single-use (SC-10) and prevents replay attacks (EP-18)
  const authCodeData = await retrieveAndDeleteAuthCode(body.code)

  // EP-17, EP-18: Validate CODE exists and is not expired/already used
  if (!authCodeData) {
    // Security event logging - invalid code (already logged in authCodeStore)
    logger.security('Token exchange failed - invalid authorization code', {
      timestamp: new Date().toISOString(),
      event: 'TOKEN_EXCHANGE_INVALID_CODE',
      codePrefix: `${body.code.substring(0, 8)}...`,
      severity: 'warning',
    })

    // EH-4: Generic error message without revealing specific reason
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired authorization code',
    })
  }

  try {
    // EP-13, EP-14: Generate JWT access token and refresh token
    const { accessToken, refreshToken } = await generateAuthTokens(
      event,
      authCodeData.providerUserInfo,
      authCodeData.provider,
      authCodeData.customClaims,
    )

    // EP-16: Set refresh token as secure, HttpOnly cookie
    if (refreshToken) {
      const cookieConfig = useRuntimeConfig(event).nuxtAegis?.tokenRefresh?.cookie
      setRefreshTokenCookie(event, refreshToken, cookieConfig)
    }

    // Get token expiration from config
    const tokenConfig = useRuntimeConfig(event).nuxtAegis?.token
    const expiresIn = tokenConfig?.expiresIn

    // Parse expiresIn to seconds
    let expiresInSeconds: number | undefined
    if (expiresIn) {
      if (typeof expiresIn === 'number') {
        expiresInSeconds = expiresIn
      }
      else if (typeof expiresIn === 'string') {
        // Parse time strings like "15m", "1h", etc.
        const match = expiresIn.match(/^(\d+)([smhd])$/)
        if (match && match[1] && match[2]) {
          const value = Number.parseInt(match[1], 10)
          const unit = match[2]
          const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
          const multiplier = multipliers[unit]
          if (multiplier !== undefined) {
            expiresInSeconds = value * multiplier
          }
        }
      }
    }

    // EP-15: Return access token in JSON response body
    const response: TokenExchangeResponse = {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    }

    // Security event logging - successful token generation
    logger.security('JWT tokens generated successfully', {
      timestamp: new Date().toISOString(),
      event: 'TOKEN_GENERATION_SUCCESS',
      expiresIn: expiresInSeconds,
    })

    return response
  }
  catch (error) {
    // Security event logging - token generation failure
    logger.error('Token generation error', {
      timestamp: new Date().toISOString(),
      event: 'TOKEN_GENERATION_ERROR',
      error: import.meta.dev ? error : 'Error details hidden in production',
      severity: 'error',
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to generate authentication tokens',
    })
  }
})
