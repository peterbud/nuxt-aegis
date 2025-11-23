import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { RefreshTokenData, TokenRefreshConfig } from '../../src/runtime/types'

/**
 * Unit Tests for Refresh Token Generation and Validation
 *
 * Tests the refresh token generation and validation in refreshToken.ts:
 * - EP-14, EP-14a: Refresh token generation with user object storage
 * - RS-5: Token rotation with previousTokenHash tracking
 * - Expiration handling
 * - Token hashing for storage keys
 */

// Mock storage
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
        encryption: {
          enabled: false,
        },
        cookie: {
          maxAge: 604800, // 7 days
        },
      },
    },
  })),
}))

describe('Refresh Token Generation', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
  })

  describe('generateAndStoreRefreshToken', () => {
    it('should generate a refresh token and store user data', async () => {
      const { generateAndStoreRefreshToken, hashRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const user = {
        sub: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        customField: 'customValue',
      }

      const tokenRefreshConfig: TokenRefreshConfig = {
        cookie: {
          maxAge: 604800,
        },
      }

      const token = await generateAndStoreRefreshToken(user, 'google', tokenRefreshConfig)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)

      // Verify data is stored
      const tokenHash = hashRefreshToken(token)
      const storedData = await getRefreshTokenData(tokenHash)

      expect(storedData).toBeDefined()
      expect(storedData?.sub).toBe('user123')
      expect(storedData?.providerUserInfo).toEqual(user)
    })

    it('should generate unique tokens for same user', async () => {
      const { generateAndStoreRefreshToken } = await import('../../src/runtime/server/utils/refreshToken')

      const user = { sub: 'user123', email: 'test@example.com' }
      const config: TokenRefreshConfig = {
        cookie: { maxAge: 604800 },
      }

      const token1 = await generateAndStoreRefreshToken(user, 'google', config)
      const token2 = await generateAndStoreRefreshToken(user, 'google', config)

      expect(token1).not.toBe(token2)
    })

    it('should set expiration time correctly', async () => {
      const { generateAndStoreRefreshToken, hashRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const user = { sub: 'user123' }
      const maxAge = 3600 // 1 hour
      const config: TokenRefreshConfig = {
        cookie: { maxAge },
      }

      const beforeGeneration = Date.now()
      const token = await generateAndStoreRefreshToken(user, 'google', config)
      const afterGeneration = Date.now()

      const tokenHash = hashRefreshToken(token)
      const storedData = await getRefreshTokenData(tokenHash)

      expect(storedData?.expiresAt).toBeDefined()
      // Should be approximately now + maxAge (allowing for test execution time)
      expect(storedData!.expiresAt).toBeGreaterThanOrEqual(beforeGeneration + (maxAge * 1000))
      expect(storedData!.expiresAt).toBeLessThanOrEqual(afterGeneration + (maxAge * 1000))
    })

    it('should initialize isRevoked as false', async () => {
      const { generateAndStoreRefreshToken, hashRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const user = { sub: 'user123' }
      const config: TokenRefreshConfig = {
        cookie: { maxAge: 604800 },
      }

      const token = await generateAndStoreRefreshToken(user, 'google', config)
      const tokenHash = hashRefreshToken(token)
      const storedData = await getRefreshTokenData(tokenHash)

      expect(storedData?.isRevoked).toBe(false)
    })

    it('should store previousTokenHash for rotation tracking', async () => {
      const { generateAndStoreRefreshToken, hashRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const user = { sub: 'user123' }
      const config: TokenRefreshConfig = {
        cookie: { maxAge: 604800 },
      }

      // Generate first token
      const firstToken = await generateAndStoreRefreshToken(user, 'google', config)
      const firstHash = hashRefreshToken(firstToken)

      // Generate second token with rotation
      const secondToken = await generateAndStoreRefreshToken(user, 'google', config, firstHash)
      const secondHash = hashRefreshToken(secondToken)

      const storedData = await getRefreshTokenData(secondHash)
      expect(storedData?.previousTokenHash).toBe(firstHash)
    })

    it('should generate URL-safe tokens', async () => {
      const { generateAndStoreRefreshToken } = await import('../../src/runtime/server/utils/refreshToken')

      const user = { sub: 'user123' }
      const config: TokenRefreshConfig = {
        cookie: { maxAge: 604800 },
      }

      const token = await generateAndStoreRefreshToken(user, 'google', config)

      // Should be base64url encoded (no +, /, or =)
      expect(token).toMatch(/^[\w-]+$/)
      expect(token).not.toContain('+')
      expect(token).not.toContain('/')
      expect(token).not.toContain('=')
    })

    it('should handle complete user objects with nested data', async () => {
      const { generateAndStoreRefreshToken, hashRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const user = {
        sub: 'user123',
        email: 'test@example.com',
        profile: {
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
        metadata: {
          createdAt: Date.now(),
          roles: ['admin', 'user'],
        },
      }

      const config: TokenRefreshConfig = {
        cookie: { maxAge: 604800 },
      }

      const token = await generateAndStoreRefreshToken(user, 'google', config)
      const tokenHash = hashRefreshToken(token)
      const storedData = await getRefreshTokenData(tokenHash)

      expect(storedData?.providerUserInfo).toEqual(user)
      expect(storedData?.providerUserInfo.profile).toEqual(user.profile)
      expect(storedData?.providerUserInfo.metadata).toEqual(user.metadata)
    })
  })

  describe('Token Expiration Validation', () => {
    it('should identify expired tokens', async () => {
      const { storeRefreshTokenData, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const expiredData: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        isRevoked: false,
        user: { sub: 'user123' },
        provider: 'google',
      }

      await storeRefreshTokenData('hash123', expiredData)
      const retrieved = await getRefreshTokenData('hash123')

      expect(retrieved).toBeDefined()
      expect(Date.now() > retrieved!.expiresAt).toBe(true)
    })

    it('should identify valid (not expired) tokens', async () => {
      const { storeRefreshTokenData, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const validData: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000, // Expires in 1 day
        isRevoked: false,
        user: { sub: 'user123' },
        provider: 'google',
      }

      await storeRefreshTokenData('hash123', validData)
      const retrieved = await getRefreshTokenData('hash123')

      expect(retrieved).toBeDefined()
      expect(Date.now() < retrieved!.expiresAt).toBe(true)
    })
  })

  describe('Token Rotation Chain', () => {
    it('should track token rotation chain through previousTokenHash', async () => {
      const { generateAndStoreRefreshToken, hashRefreshToken, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const user = { sub: 'user123', email: 'test@example.com' }
      const config: TokenRefreshConfig = {
        cookie: { maxAge: 604800 },
      }

      // Generate token 1
      const token1 = await generateAndStoreRefreshToken(user, 'google', config)
      const hash1 = hashRefreshToken(token1)

      // Generate token 2 (rotated from token 1)
      const token2 = await generateAndStoreRefreshToken(user, 'google', config, hash1)
      const hash2 = hashRefreshToken(token2)

      // Generate token 3 (rotated from token 2)
      const token3 = await generateAndStoreRefreshToken(user, 'google', config, hash2)
      const hash3 = hashRefreshToken(token3)

      // Verify rotation chain
      const data1 = await getRefreshTokenData(hash1)
      const data2 = await getRefreshTokenData(hash2)
      const data3 = await getRefreshTokenData(hash3)

      expect(data1?.previousTokenHash).toBeUndefined()
      expect(data2?.previousTokenHash).toBe(hash1)
      expect(data3?.previousTokenHash).toBe(hash2)
    })
  })
})
