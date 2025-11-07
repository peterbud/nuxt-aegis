import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { generateMockCode, storeMockCode } from '../../utils/mockCodeStore'

/**
 * Mock Google Authorization Endpoint
 * Simulates: https://accounts.google.com/o/oauth2/v2/auth
 *
 * This simulates what Google does when users are redirected to login.
 * In a real scenario, users would see Google's login page.
 * For testing, we auto-approve and redirect back immediately.
 *
 * Query Parameters (from Aegis):
 * - response_type: Should be 'code'
 * - client_id: OAuth client ID
 * - redirect_uri: Where to redirect back
 * - scope: Requested scopes (openid, profile, email)
 * - state: Optional state parameter for CSRF protection
 *
 * Flow:
 * 1. Validate OAuth parameters
 * 2. Generate mock authorization code
 * 3. Store code with mock user data
 * 4. Redirect back to redirect_uri with code
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Validate required OAuth parameters
  if (!query.client_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing required parameter: client_id',
    })
  }

  if (!query.redirect_uri || typeof query.redirect_uri !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing required parameter: redirect_uri',
    })
  }

  if (query.response_type !== 'code') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Invalid response_type. Must be "code"',
    })
  }

  // Check for mock error simulation
  if (query.mock_error) {
    // Simulate OAuth provider returning an error
    return sendRedirect(event, withQuery(query.redirect_uri as string, {
      error: query.mock_error as string,
      error_description: 'Mock OAuth error for testing',
      state: query.state as string || '',
    }))
  }

  // Generate mock authorization code
  const code = generateMockCode()

  // Store code with mock user data
  // In real Google, this would be associated with the authenticated user
  // For testing, we use a hardcoded mock user
  storeMockCode({
    code,
    userId: 'mock-google-user-12345', // Mock Google user ID
    clientId: query.client_id as string,
    redirectUri: query.redirect_uri as string,
  })

  console.log('[Mock Google] Generated authorization code:', {
    code: code.substring(0, 20) + '...',
    clientId: query.client_id,
    redirectUri: query.redirect_uri,
  })

  // Redirect back to the application with authorization code
  return sendRedirect(event, withQuery(query.redirect_uri as string, {
    code,
    state: query.state as string || '',
  }))
})
