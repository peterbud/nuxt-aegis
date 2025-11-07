import { defineEventHandler, readBody, createError } from 'h3'
import { retrieveAndDeleteMockCode } from '../../utils/mockCodeStore'

/**
 * Mock Google Token Endpoint
 * Simulates: https://oauth2.googleapis.com/token
 *
 * This simulates Google's token exchange endpoint.
 * Exchanges authorization code for OAuth tokens.
 *
 * Request Body (from Aegis):
 * - code: Authorization code from authorize endpoint
 * - client_id: OAuth client ID
 * - client_secret: OAuth client secret
 * - redirect_uri: Same redirect_uri used in authorize
 * - grant_type: Should be 'authorization_code'
 *
 * Response:
 * - access_token: OAuth access token for Google APIs
 * - refresh_token: OAuth refresh token
 * - id_token: JWT ID token with user info
 * - expires_in: Token lifetime in seconds
 * - token_type: Should be 'Bearer'
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

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

  // Retrieve and validate authorization code
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

  console.log('[Mock Google] Token exchange successful for user:', codeData.userId)

  // Return mock OAuth tokens
  // These simulate what Google would return
  return {
    access_token: `mock_google_access_token_${Math.random().toString(36).substring(2)}`,
    refresh_token: `mock_google_refresh_token_${Math.random().toString(36).substring(2)}`,
    id_token: `mock.google.idtoken.${Math.random().toString(36).substring(2)}`,
    expires_in: 3600, // 1 hour
    token_type: 'Bearer',
    scope: 'openid profile email',
  }
})
