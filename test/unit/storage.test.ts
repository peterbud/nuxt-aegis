import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RefreshTokenData } from '../../src/runtime/types'

/**
 * Unit Tests for Refresh Token Storage Operations
 *
 * Tests the storage utilities in refreshToken.ts:
 * - RS-3, RS-4: Store and retrieve refresh token data
 * - RS-6: Delete refresh token data
 * - RS-7, SC-15: Revoke refresh tokens
 * - Storage persistence and error handling
 */

// Mock the useStorage function
const mockStorage = new Map<string, RefreshTokenData>()
vi.mock('#imports', () => ({
  useStorage: vi.fn(() => ({
    setItem: vi.fn(async (key: string, value: RefreshTokenData) => {
      mockStorage.set(key, value)
    }),
    getItem: vi.fn(async (key: string) => {
      return mockStorage.get(key) || null
    }),
    removeItem: vi.fn(async (key: string) => {
      mockStorage.delete(key)
    }),
  })),
  useRuntimeConfig: vi.fn(() => ({
    nuxtAegis: {
      tokenRefresh: {
        storage: {
          prefix: 'refresh:',
        },
        encryption: {
          enabled: false,
        },
      },
    },
  })),
}))

describe('Refresh Token Storage', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear()
    vi.clearAllMocks()
  })

  describe('storeRefreshTokenData', () => {
    it('should store refresh token data with correct storage key', async () => {
      const { storeRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const tokenHash = 'abc123hash'
      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        user: {
          sub: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        },
      }

      await storeRefreshTokenData(tokenHash, data)

      // Verify data was stored with correct prefix
      const storedData = mockStorage.get('refresh:abc123hash')
      expect(storedData).toBeDefined()
      expect(storedData!.sub).toBe('user123')
      expect(storedData!.user.email).toBe('test@example.com')
    })

    it('should store complete user object', async () => {
      const { storeRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        user: {
          sub: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          customField: 'customValue',
          roles: ['admin', 'user'],
        },
      }

      await storeRefreshTokenData('hash123', data)

      const storedData = mockStorage.get('refresh:hash123')
      expect(storedData).toBeDefined()
      expect(storedData!.user).toEqual(data.user)
      expect(storedData!.user.customField).toBe('customValue')
      expect(storedData!.user.roles).toEqual(['admin', 'user'])
    })

    it('should store metadata fields correctly', async () => {
      const { storeRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const expiresAt = Date.now() + 86400000
      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt,
        isRevoked: false,
        previousTokenHash: 'oldtoken456',
        user: { sub: 'user123' },
      }

      await storeRefreshTokenData('hash123', data)

      const storedData = mockStorage.get('refresh:hash123')
      expect(storedData).toBeDefined()
      expect(storedData!.sub).toBe('user123')
      expect(storedData!.expiresAt).toBe(expiresAt)
      expect(storedData!.isRevoked).toBe(false)
      expect(storedData!.previousTokenHash).toBe('oldtoken456')
    })
  })

  describe('getRefreshTokenData', () => {
    it('should retrieve stored refresh token data', async () => {
      const { storeRefreshTokenData, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        user: { sub: 'user123', email: 'test@example.com' },
      }

      await storeRefreshTokenData('hash123', data)
      const retrieved = await getRefreshTokenData('hash123')

      expect(retrieved).toBeDefined()
      expect(retrieved?.sub).toBe('user123')
      expect(retrieved?.user.email).toBe('test@example.com')
    })

    it('should return null for non-existent token', async () => {
      const { getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const retrieved = await getRefreshTokenData('nonexistent')

      expect(retrieved).toBeNull()
    })

    it('should preserve all user object fields', async () => {
      const { storeRefreshTokenData, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        user: {
          sub: 'user123',
          email: 'test@example.com',
          profile: {
            avatar: 'https://example.com/avatar.jpg',
            bio: 'Test bio',
          },
          permissions: ['read', 'write', 'delete'],
        },
      }

      await storeRefreshTokenData('hash123', data)
      const retrieved = await getRefreshTokenData('hash123')

      expect(retrieved?.user.profile).toEqual(data.user.profile)
      expect(retrieved?.user.permissions).toEqual(data.user.permissions)
    })
  })

  describe('deleteRefreshTokenData', () => {
    it('should delete refresh token data', async () => {
      const { storeRefreshTokenData, deleteRefreshTokenData, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        user: { sub: 'user123' },
      }

      await storeRefreshTokenData('hash123', data)

      // Verify it exists
      let retrieved = await getRefreshTokenData('hash123')
      expect(retrieved).toBeDefined()

      // Delete it
      await deleteRefreshTokenData('hash123')

      // Verify it's gone
      retrieved = await getRefreshTokenData('hash123')
      expect(retrieved).toBeNull()
    })

    it('should handle deleting non-existent token gracefully', async () => {
      const { deleteRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      // Should not throw
      await expect(deleteRefreshTokenData('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('revokeRefreshToken', () => {
    it('should mark token as revoked without deleting it', async () => {
      const { storeRefreshTokenData, revokeRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        user: { sub: 'user123' },
      }

      await storeRefreshTokenData('hash123', data)
      await revokeRefreshToken('hash123')

      const retrieved = await getRefreshTokenData('hash123')
      expect(retrieved).toBeDefined()
      expect(retrieved?.isRevoked).toBe(true)
      expect(retrieved?.user).toEqual(data.user)
    })

    it('should handle revoking non-existent token gracefully', async () => {
      const { revokeRefreshToken } = await import('../../src/runtime/server/utils/refreshToken')

      // Should not throw
      await expect(revokeRefreshToken('nonexistent')).resolves.toBeUndefined()
    })

    it('should preserve all data when revoking', async () => {
      const { storeRefreshTokenData, revokeRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const expiresAt = Date.now() + 86400000
      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt,
        isRevoked: false,
        previousTokenHash: 'oldtoken',
        user: { sub: 'user123', email: 'test@example.com', roles: ['admin'] },
      }

      await storeRefreshTokenData('hash123', data)
      await revokeRefreshToken('hash123')

      const retrieved = await getRefreshTokenData('hash123')
      expect(retrieved?.sub).toBe('user123')
      expect(retrieved?.expiresAt).toBe(expiresAt)
      expect(retrieved?.previousTokenHash).toBe('oldtoken')
      expect(retrieved?.user.roles).toEqual(['admin'])
      expect(retrieved?.isRevoked).toBe(true)
    })
  })

  describe('hashRefreshToken', () => {
    it('should generate consistent hash for same input', async () => {
      const { hashRefreshToken } = await import('../../src/runtime/server/utils/refreshToken')

      const token = 'test-refresh-token-12345'
      const hash1 = hashRefreshToken(token)
      const hash2 = hashRefreshToken(token)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different inputs', async () => {
      const { hashRefreshToken } = await import('../../src/runtime/server/utils/refreshToken')

      const hash1 = hashRefreshToken('token1')
      const hash2 = hashRefreshToken('token2')

      expect(hash1).not.toBe(hash2)
    })

    it('should generate URL-safe hash', async () => {
      const { hashRefreshToken } = await import('../../src/runtime/server/utils/refreshToken')

      const hash = hashRefreshToken('test-token')

      // Should not contain characters that need URL encoding
      expect(hash).toMatch(/^[\w-]+$/)
    })
  })
})
