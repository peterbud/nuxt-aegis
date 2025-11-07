import { defineEventHandler, getHeader, createError } from 'h3'

/**
 * Mock Google UserInfo Endpoint
 * Simulates: https://www.googleapis.com/oauth2/v3/userinfo
 *
 * This simulates Google's user profile endpoint.
 * Returns user information based on the access token.
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - sub: Google user ID (subject)
 * - email: User's email address
 * - email_verified: Whether email is verified
 * - name: Full name
 * - given_name: First name
 * - family_name: Last name
 * - picture: Profile picture URL
 * - locale: User's locale
 */
export default defineEventHandler(async (event) => {
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

  // Validate access token format
  if (!accessToken.startsWith('mock_google_access_token_')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid access token',
    })
  }

  console.log('[Mock Google] UserInfo request with token:', accessToken.substring(0, 30) + '...')

  // Return mock user profile
  // This is what Google would return for an authenticated user
  return {
    sub: 'mock-google-user-12345',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/mock-avatar',
    locale: 'en',
  }
})
