/**
 * Mock Authorization Code Storage
 *
 * Simulates Google's authorization code storage and validation.
 * This is NOT Aegis code - this simulates what Google does internally.
 *
 * Stores temporary authorization codes that are:
 * - Single-use (deleted after exchange)
 * - Short-lived (expire after 60 seconds)
 * - Associated with user data
 */

interface MockAuthCode {
  code: string
  userId: string
  clientId: string
  redirectUri: string
  createdAt: number
  expiresAt: number
}

// In-memory storage for mock codes
const mockCodes = new Map<string, MockAuthCode>()

/**
 * Generate a random mock authorization code
 */
export function generateMockCode(): string {
  // Simple random code for testing - Google would use more secure generation
  return `mock_google_code_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
}

/**
 * Store a mock authorization code
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
    expiresAt: now + 60000, // 60 seconds - typical OAuth code lifetime
  })
}

/**
 * Retrieve and delete a mock authorization code (single-use enforcement)
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
 * Cleanup expired codes (optional maintenance)
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
 * Get stats (for debugging/testing)
 */
export function getMockCodeStats() {
  return {
    total: mockCodes.size,
    codes: Array.from(mockCodes.values()).map(c => ({
      code: c.code.substring(0, 20) + '...',
      userId: c.userId,
      expired: Date.now() > c.expiresAt,
    })),
  }
}
