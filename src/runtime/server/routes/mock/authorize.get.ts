import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { useRuntimeConfig } from '#imports'
import { generateMockCode, storeMockCode } from '../../utils/mockCodeStore'

/**
 * Mock OAuth Authorization Endpoint
 * Simulates: OAuth provider's authorization endpoint
 *
 * DEVELOPMENT/TEST ONLY
 *
 * This simulates an OAuth provider's authorization flow.
 * In real OAuth, users would see a login/consent page.
 * For testing, we auto-approve and redirect back immediately.
 *
 * Query Parameters:
 * - response_type: Should be 'code'
 * - client_id: OAuth client ID
 * - redirect_uri: Where to redirect back
 * - scope: Requested scopes
 * - state: Optional state parameter for CSRF protection
 * - user: (Optional) User persona identifier from mockUsers config
 * - mock_error: (Optional) Simulate OAuth error response
 *
 * Error Simulation:
 * - ?mock_error=access_denied - User denied access
 * - ?mock_error=invalid_request - Invalid request parameters
 * - ?mock_error=unauthorized_client - Client not authorized
 * - ?mock_error=invalid_scope - Invalid scope requested
 * - ?mock_error=server_error - Server error
 * - ?mock_error=temporarily_unavailable - Service temporarily unavailable
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const runtimeConfig = useRuntimeConfig(event)
  const mockConfig = runtimeConfig.nuxtAegis?.providers?.mock

  if (!mockConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: '[nuxt-aegis] Mock provider not configured',
    })
  }

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
    const validErrors = [
      'access_denied',
      'invalid_request',
      'unauthorized_client',
      'invalid_scope',
      'server_error',
      'temporarily_unavailable',
    ]

    const errorCode = query.mock_error as string
    const errorDescription = getErrorDescription(errorCode)

    if (!validErrors.includes(errorCode)) {
      console.warn(`[nuxt-aegis] Invalid mock_error: ${errorCode}. Valid errors:`, validErrors)
    }

    // Simulate OAuth provider returning an error
    return sendRedirect(event, withQuery(query.redirect_uri as string, {
      error: errorCode,
      error_description: errorDescription,
      state: query.state as string || '',
    }))
  }

  // Determine which user persona to use
  const userParam = query.user as string | undefined
  const userId = (userParam || mockConfig.defaultUser || Object.keys(mockConfig.mockUsers)[0]) as string

  // Ensure userId is always defined
  if (!userId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: '[nuxt-aegis] Mock provider has no users configured',
    })
  }

  // Validate user exists in mockUsers
  if (!mockConfig.mockUsers[userId]) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `[nuxt-aegis] Invalid user persona: ${userId}. Available: ${Object.keys(mockConfig.mockUsers).join(', ')}`,
    })
  }

  // Generate mock authorization code
  const code = generateMockCode()

  // Store code with selected user identifier
  storeMockCode({
    code,
    userId, // Store the user persona identifier
    clientId: query.client_id as string,
    redirectUri: query.redirect_uri as string,
  })

  if (import.meta.dev) {
    console.log('[nuxt-aegis:mock] Generated authorization code:', {
      code: code.substring(0, 20) + '...',
      user: userId,
      clientId: query.client_id,
    })
  }

  // Redirect back to the application with authorization code
  return sendRedirect(event, withQuery(query.redirect_uri as string, {
    code,
    state: query.state as string || '',
  }))
})

/**
 * Get human-readable error description for OAuth error codes
 */
function getErrorDescription(errorCode: string): string {
  const descriptions: Record<string, string> = {
    access_denied: 'The user denied the authorization request',
    invalid_request: 'The request is missing a required parameter or is otherwise malformed',
    unauthorized_client: 'The client is not authorized to request an authorization code',
    invalid_scope: 'The requested scope is invalid, unknown, or malformed',
    server_error: 'The authorization server encountered an unexpected error',
    temporarily_unavailable: 'The authorization server is currently unable to handle the request',
  }

  return descriptions[errorCode] || 'Mock OAuth error for testing'
}
