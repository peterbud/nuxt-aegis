import { defineEventHandler, getHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getUserForMockToken } from '../../utils/mockCodeStore'

/**
 * Mock OAuth UserInfo Endpoint
 * Simulates: OAuth provider's user profile endpoint
 *
 * DEVELOPMENT/TEST ONLY
 *
 * Returns user information based on the access token.
 * The user data is retrieved from the mockUsers configuration
 * using the token->user mapping stored during token exchange.
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * User profile data from mockUsers configuration, including:
 * - sub: User subject identifier (required)
 * - email: User's email address (required)
 * - name: User's full name (required)
 * - Additional custom claims as defined in mockUsers
 */
export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const mockConfig = runtimeConfig.nuxtAegis?.providers?.mock

  if (!mockConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: '[nuxt-aegis] Mock provider not configured',
    })
  }

  // Validate Authorization header
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing authorization header',
    })
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid authorization header format',
    })
  }

  const accessToken = authHeader.substring(7) // Remove 'Bearer ' prefix

  // Validate access token format (from our mock token endpoint)
  if (!accessToken.startsWith('mock_aegis_access_')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid access token',
    })
  }

  // Retrieve user ID from token mapping
  const userId = getUserForMockToken(accessToken)

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or expired access token',
    })
  }

  // Get user data from mockUsers configuration
  const userData = mockConfig.mockUsers[userId]

  if (!userData) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `[nuxt-aegis] Mock user '${userId}' not found in configuration`,
    })
  }

  if (import.meta.dev) {
    console.log('[nuxt-aegis:mock] UserInfo request returning user:', userId)
  }

  // Return mock user profile
  // This includes all fields from the mockUsers configuration
  return {
    ...userData,
  }
})
