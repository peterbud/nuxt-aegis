import { describe, it, expect, vi, afterEach } from 'vitest'
import type { RefreshTokenData } from '../../src/runtime/types'

/**
 * Unit Tests for Refresh Token Encryption
 *
 * Tests the encryption/decryption utilities in refreshToken.ts:
 * - SC-17, SC-18: AES-256-GCM encryption for sensitive data
 * - SC-19: Encryption key validation
 * - SC-20: Transparent encryption/decryption in storage operations
 * - Data integrity and error handling
 */

describe('Refresh Token Encryption', () => {
  const testEncryptionKey = 'a'.repeat(64) // 32-byte hex string

  afterEach(() => {
    vi.resetModules()
  })

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
                algorithm: 'aes-256-gcm',
              },
            },
          },
        })),
      }))

      const { encryptData, decryptData } = await import('../../src/runtime/server/utils/refreshToken')

      const originalData = {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['admin', 'user'],
      }

      const encrypted = encryptData(originalData, testEncryptionKey)
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toContain('test@example.com')
      expect(encrypted).not.toContain('user123')

      const decrypted = decryptData(encrypted, testEncryptionKey)
      expect(decrypted).toEqual(originalData)
    })

    it('should produce different ciphertext for same data (unique IV)', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
              },
            },
          },
        })),
      }))

      const { encryptData } = await import('../../src/runtime/server/utils/refreshToken')

      const data = { test: 'data' }

      const encrypted1 = encryptData(data, testEncryptionKey)
      const encrypted2 = encryptData(data, testEncryptionKey)

      // Should be different due to unique IV
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle complex nested objects', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
              },
            },
          },
        })),
      }))

      const { encryptData, decryptData } = await import('../../src/runtime/server/utils/refreshToken')

      const complexData = {
        user: {
          profile: {
            name: 'Test User',
            avatar: 'https://example.com/avatar.jpg',
          },
          metadata: {
            lastLogin: Date.now(),
            permissions: ['read', 'write'],
          },
        },
        customClaims: {
          roles: ['admin'],
          tenant: 'tenant-123',
        },
      }

      const encrypted = encryptData(complexData, testEncryptionKey)
      const decrypted = decryptData(encrypted, testEncryptionKey)

      expect(decrypted).toEqual(complexData)
    })

    it('should fail to decrypt with wrong key', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
              },
            },
          },
        })),
      }))

      const { encryptData, decryptData } = await import('../../src/runtime/server/utils/refreshToken')

      const data = { secret: 'data' }
      const encrypted = encryptData(data, testEncryptionKey)
      const wrongKey = 'b'.repeat(64)

      expect(() => {
        decryptData(encrypted, wrongKey)
      }).toThrow()
    })

    it('should fail to decrypt tampered ciphertext', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
              },
            },
          },
        })),
      }))

      const { encryptData, decryptData } = await import('../../src/runtime/server/utils/refreshToken')

      const data = { secret: 'data' }
      const encrypted = encryptData(data, testEncryptionKey)

      // Tamper with the auth tag portion (bytes 12-28 in the combined buffer)
      // Decode, modify a byte in the auth tag, re-encode
      const combined = Buffer.from(encrypted, 'base64')
      combined[12] = combined[12] ^ 0xFF // Flip bits in first byte of auth tag
      const tampered = combined.toString('base64')

      expect(() => {
        decryptData(tampered, testEncryptionKey)
      }).toThrow()
    })
  })

  describe('getEncryptionConfig', () => {
    it('should return encryption config from runtime config', async () => {
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
                algorithm: 'aes-256-gcm',
              },
            },
          },
        })),
      }))

      const { getEncryptionConfig } = await import('../../src/runtime/server/utils/refreshToken')

      const config = getEncryptionConfig()

      expect(config.enabled).toBe(true)
      expect(config.key).toBe(testEncryptionKey)
      expect(config.algorithm).toBe('aes-256-gcm')
    })

    it('should default to disabled when not configured', async () => {
      vi.resetModules()
      vi.doMock('#imports', () => ({
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {},
          },
        })),
      }))

      const { getEncryptionConfig } = await import('../../src/runtime/server/utils/refreshToken')

      const config = getEncryptionConfig()

      expect(config.enabled).toBe(false)
      expect(config.key).toBeUndefined()
    })
  })

  describe('Storage with encryption enabled', () => {
    it('should transparently encrypt when storing and decrypt when retrieving', async () => {
      const mockStorage = new Map<string, { encrypted: string } | RefreshTokenData>()

      vi.doMock('#imports', () => ({
        useStorage: vi.fn(() => ({
          setItem: vi.fn(async (key: string, value: { encrypted: string } | RefreshTokenData) => {
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
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: true,
                key: testEncryptionKey,
                algorithm: 'aes-256-gcm',
              },
            },
          },
        })),
      }))

      const { storeRefreshTokenData, getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      const data: RefreshTokenData = {
        sub: 'user123',
        expiresAt: Date.now() + 86400000,
        isRevoked: false,
        providerUserInfo: {
          sub: 'user123',
          email: 'sensitive@example.com',
          ssn: '123-45-6789',
        },
        provider: 'google',
      }

      await storeRefreshTokenData('hash123', data)

      // Verify data is stored encrypted
      const storedData = mockStorage.get('hash123')
      expect(storedData).toBeDefined()
      expect(storedData).toHaveProperty('encrypted')

      // Encrypted data should not contain plaintext
      const encryptedString = JSON.stringify(storedData)
      expect(encryptedString).not.toContain('sensitive@example.com')
      expect(encryptedString).not.toContain('123-45-6789')

      // Verify data can be retrieved and decrypted
      const retrieved = await getRefreshTokenData('hash123')
      expect(retrieved).toEqual(data)
      expect(retrieved?.providerUserInfo.email).toBe('sensitive@example.com')
    })

    it('should throw error when trying to decrypt without key', async () => {
      const mockStorage = new Map<string, { encrypted: string }>()

      vi.doMock('#imports', () => ({
        useStorage: vi.fn(() => ({
          getItem: vi.fn(async (key: string) => {
            return mockStorage.get(key) || null
          }),
        })),
        useRuntimeConfig: vi.fn(() => ({
          nuxtAegis: {
            logging: { level: 'silent' },
            tokenRefresh: {
              encryption: {
                enabled: false, // Encryption disabled but data is encrypted
              },
            },
          },
        })),
      }))

      // Store encrypted data manually
      mockStorage.set('hash123', { encrypted: 'some-encrypted-data' })

      const { getRefreshTokenData } = await import('../../src/runtime/server/utils/refreshToken')

      await expect(getRefreshTokenData('hash123')).rejects.toThrow()
    })
  })
})
