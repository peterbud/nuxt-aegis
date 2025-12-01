import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createResetSession,
  validateAndDeleteResetSession,
} from '../../src/runtime/server/utils/resetSessionStore'

// Mock useStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

vi.mock('#imports', () => ({
  useStorage: () => mockStorage,
}))

vi.mock('../../src/runtime/server/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    security: vi.fn(),
  }),
}))

describe('Reset Session Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createResetSession', () => {
    it('should create and store reset session', async () => {
      const email = 'test@example.com'
      const sessionId = await createResetSession(email)

      expect(sessionId).toBeDefined()
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `reset:${sessionId}`,
        expect.objectContaining({
          email: 'test@example.com',
        }),
      )
    })
  })

  describe('validateAndDeleteResetSession', () => {
    it('should return null if session not found', async () => {
      mockStorage.getItem.mockResolvedValueOnce(null)
      const result = await validateAndDeleteResetSession('session-id')
      expect(result).toBeNull()
    })

    it('should return null if expired', async () => {
      mockStorage.getItem.mockResolvedValueOnce({
        email: 'test@example.com',
        expiresAt: Date.now() - 1000,
      })

      const result = await validateAndDeleteResetSession('session-id')
      expect(result).toBeNull()
      expect(mockStorage.removeItem).toHaveBeenCalledWith('reset:session-id')
    })

    it('should return email and delete session if valid', async () => {
      mockStorage.getItem.mockResolvedValueOnce({
        email: 'test@example.com',
        expiresAt: Date.now() + 1000,
      })

      const result = await validateAndDeleteResetSession('session-id')
      expect(result).toBe('test@example.com')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('reset:session-id')
    })
  })
})
