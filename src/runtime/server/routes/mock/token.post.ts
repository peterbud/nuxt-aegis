import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { retrieveAndDeleteMockCode, storeMockToken } from '../../utils/mockCodeStore'
import { createLogger } from '../../utils/logger'

const logger = createLogger('MockToken')

/**
 * Mock OAuth Token Endpoint
 * Simulates: OAuth provider's token exchange endpoint
 *
 * DEVELOPMENT/TEST ONLY
 *
 * Exchanges authorization code for OAuth tokens.
 *
 * Request Body:
 * - code: Authorization code from authorize endpoint
 * - client_id: OAuth client ID
 * - client_secret: OAuth client secret
 * - redirect_uri: Same redirect_uri used in authorize
 * - grant_type: Should be 'authorization_code'
 *
 * Response:
 * - access_token: OAuth access token
 * - refresh_token: OAuth refresh token
 * - id_token: JWT ID token (optional)
 * - expires_in: Token lifetime in seconds
 * - token_type: Always 'Bearer'
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const runtimeConfig = useRuntimeConfig(event)
  const mockConfig = runtimeConfig.nuxtAegis?.providers?.mock

  if (!mockConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: '[nuxt-aegis] Mock provider not configured',
    })
  }

  // Validate required parameters
  if (!body.code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_request',
      message: 'Missing required parameter: code',
    })
  }

  if (!body.client_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_request',
      message: 'Missing required parameter: client_id',
    })
  }

  if (!body.client_secret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_request',
      message: 'Missing required parameter: client_secret',
    })
  }

  if (body.grant_type !== 'authorization_code') {
    throw createError({
      statusCode: 400,
      statusMessage: 'unsupported_grant_type',
      message: 'Invalid grant_type. Must be "authorization_code"',
    })
  }

  // Retrieve and validate authorization code (single-use)
  const codeData = retrieveAndDeleteMockCode(body.code)

  if (!codeData) {
    // Code is invalid, expired, or already used
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_grant',
      message: 'Invalid authorization code',
    })
  }

  // Validate client_id matches
  if (codeData.clientId !== body.client_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_grant',
      message: 'Client ID mismatch',
    })
  }

  // Validate redirect_uri matches
  if (codeData.redirectUri !== body.redirect_uri) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invalid_grant',
      message: 'Redirect URI mismatch',
    })
  }

  // Validate client_secret
  if (body.client_secret !== mockConfig.clientSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'invalid_client',
      message: 'Invalid client credentials',
    })
  }

  logger.debug('Token exchange successful for user:', codeData.userId)

  // Generate cryptographically secure mock tokens
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const accessToken = `mock_aegis_access_${randomHex}`

  // Store token -> user mapping for userinfo endpoint
  storeMockToken(accessToken, codeData.userId)

  // Return mock OAuth tokens
  return {
    access_token: accessToken,
    refresh_token: `mock_aegis_refresh_${randomHex.slice(0, 32)}`,
    id_token: `mock.aegis.idtoken.${randomHex.slice(0, 24)}`,
    expires_in: 3600, // 1 hour
    token_type: 'Bearer',
    scope: mockConfig.scopes?.join(' ') || 'openid profile email',
  }
})
