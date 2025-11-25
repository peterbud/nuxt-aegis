/**
 * Mock Authorization Code Storage
 *
 * Simulates OAuth provider's authorization code storage and validation.
 * This is NOT the Aegis authorization CODE - this simulates the provider's code.
 *
 * Stores temporary authorization codes that are:
 * - Single-use (deleted after exchange)
 * - Short-lived (expire after 60 seconds)
 * - Associated with selected user persona
 *
 * DEVELOPMENT/TEST ONLY - Not available in production
 */

interface MockAuthCode {
  code: string
  /** Selected user persona identifier from mockUsers config */
  userId: string
  clientId: string
  redirectUri: string
  createdAt: number
  expiresAt: number
}

interface MockToken {
  token: string
  /** Selected user persona identifier */
  userId: string
  createdAt: number
}

// In-memory storage for mock authorization codes
const mockCodes = new Map<string, MockAuthCode>()

// In-memory storage for mock access tokens -> user mapping
const mockTokens = new Map<string, MockToken>()

/**
 * Generate a cryptographically random mock authorization code
 */
export function generateMockCode(): string {
  // Use crypto.randomBytes for secure generation
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `mock_code_${randomHex}_${Date.now()}`
}

/**
 * Store a mock authorization code with expiration
 *
 * @param data - Code data object
 * @param data.code - Authorization code string
 * @param data.userId - User persona identifier
 * @param data.clientId - OAuth client ID
 * @param data.redirectUri - OAuth redirect URI
 */
export function storeMockCode(data: {
  code: string
  userId: string
  clientId: string
  redirectUri: string
}): void {
  const now = Date.now()
  mockCodes.set(data.code, {
    ...data,
    createdAt: now,
    expiresAt: now + 60000, // 60 seconds - standard OAuth code lifetime
  })
}

/**
 * Retrieve and delete a mock authorization code (single-use enforcement)
 *
 * @param code - Authorization code to retrieve
 * @returns Code data if valid and not expired, null otherwise
 */
export function retrieveAndDeleteMockCode(code: string): MockAuthCode | null {
  const codeData = mockCodes.get(code)

  if (!codeData) {
    return null
  }

  // Check expiration
  if (Date.now() > codeData.expiresAt) {
    mockCodes.delete(code)
    return null
  }

  // Single-use: delete after retrieval
  mockCodes.delete(code)

  return codeData
}

/**
 * Cleanup expired mock codes (maintenance)
 *
 * @returns Number of codes cleaned up
 */
export function cleanupExpiredMockCodes(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [code, data] of mockCodes.entries()) {
    if (now > data.expiresAt) {
      mockCodes.delete(code)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Get count of active mock codes (for debugging)
 */
export function getMockCodeCount(): number {
  return mockCodes.size
}

/**
 * Clear all mock codes (for testing)
 */
export function clearAllMockCodes(): void {
  mockCodes.clear()
}

/**
 * Store a mock access token with user mapping
 * Allows userinfo endpoint to retrieve the correct user
 *
 * @param token - Access token string
 * @param userId - User persona identifier
 */
export function storeMockToken(token: string, userId: string): void {
  mockTokens.set(token, {
    token,
    userId,
    createdAt: Date.now(),
  })
}

/**
 * Get user ID for a mock access token
 *
 * @param token - Access token string
 * @returns User persona identifier or null if token not found
 */
export function getUserForMockToken(token: string): string | null {
  const tokenData = mockTokens.get(token)
  return tokenData?.userId || null
}

/**
 * Clear expired mock tokens (maintenance)
 * Tokens older than 2 hours are removed
 *
 * @returns Number of tokens cleaned up
 */
export function cleanupExpiredMockTokens(): number {
  const now = Date.now()
  const maxAge = 2 * 60 * 60 * 1000 // 2 hours
  let cleaned = 0

  for (const [token, data] of mockTokens.entries()) {
    if (now - data.createdAt > maxAge) {
      mockTokens.delete(token)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Clear all mock tokens (for testing)
 */
export function clearAllMockTokens(): void {
  mockTokens.clear()
}
