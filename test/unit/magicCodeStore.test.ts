import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  storeMagicCode,
  validateAndIncrementAttempts,
  retrieveAndDeleteMagicCode,
} from '../../src/runtime/server/utils/magicCodeStore'

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

describe('Magic Code Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('storeMagicCode', () => {
    it('should generate and store magic code', async () => {
      const email = 'test@example.com'
      const type = 'login'
      const data = { some: 'data' }

      const code = await storeMagicCode(email, type, data)

      expect(code).toHaveLength(6)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `magic:${code}`,
        expect.objectContaining({
          email: 'test@example.com',
          type: 'login',
          attempts: 0,
          maxAttempts: 5,
          some: 'data',
        }),
      )
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `magic-lookup:test@example.com:login`,
        code,
      )
    })

    it('should remove existing code if present', async () => {
      mockStorage.getItem.mockResolvedValueOnce('old-code') // lookup returns old code

      await storeMagicCode('test@example.com', 'login', {})

      expect(mockStorage.removeItem).toHaveBeenCalledWith('magic:old-code')
    })
  })

  describe('validateAndIncrementAttempts', () => {
    it('should return null if code not found', async () => {
      mockStorage.getItem.mockResolvedValueOnce(null)
      const result = await validateAndIncrementAttempts('123456')
      expect(result).toBeNull()
    })

    it('should return null and delete if expired', async () => {
      mockStorage.getItem.mockResolvedValueOnce({
        email: 'test@example.com',
        type: 'login',
        expiresAt: Date.now() - 1000, // Expired
      })

      const result = await validateAndIncrementAttempts('123456')
      expect(result).toBeNull()
      expect(mockStorage.removeItem).toHaveBeenCalledWith('magic:123456')
    })

    it('should return null and delete if max attempts exceeded', async () => {
      mockStorage.getItem.mockResolvedValueOnce({
        email: 'test@example.com',
        type: 'login',
        attempts: 5,
        maxAttempts: 5,
        expiresAt: Date.now() + 1000,
      })

      const result = await validateAndIncrementAttempts('123456')
      expect(result).toBeNull()
      expect(mockStorage.removeItem).toHaveBeenCalledWith('magic:123456')
    })

    it('should increment attempts and return data if valid', async () => {
      const data = {
        email: 'test@example.com',
        type: 'login',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: Date.now() + 1000,
      }
      mockStorage.getItem.mockResolvedValueOnce(data)

      const result = await validateAndIncrementAttempts('123456')

      expect(result).toEqual(expect.objectContaining({ attempts: 1 }))
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'magic:123456',
        expect.objectContaining({ attempts: 1 }),
      )
    })
  })

  describe('retrieveAndDeleteMagicCode', () => {
    it('should return data and delete code', async () => {
      const data = {
        email: 'test@example.com',
        type: 'login',
      }
      mockStorage.getItem.mockResolvedValueOnce(data)

      const result = await retrieveAndDeleteMagicCode('123456')

      expect(result).toEqual(data)
      expect(mockStorage.removeItem).toHaveBeenCalledWith('magic:123456')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('magic-lookup:test@example.com:login')
    })
  })
})
