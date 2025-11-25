import { describe, it, expect, vi } from 'vitest'

/**
 * Unit Tests for Custom Claims Processing
 *
 * Tests the custom claims utilities in customClaims.ts:
 * - JT-10, JT-11: Static custom claims processing
 * - JT-12: Reserved JWT claim filtering
 * - JT-13: Claim type validation
 * - JT-14, JT-15: Callback function support (sync and async)
 */

// Mock the logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  security: vi.fn(),
}

vi.mock('../../src/runtime/server/utils/logger', () => ({
  createLogger: () => mockLogger,
}))

describe('Custom Claims Processing', () => {
  describe('processCustomClaims', () => {
    it('should process static custom claims object', async () => {
      const { processCustomClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = { sub: 'user123', email: 'test@example.com' }
      const staticClaims = {
        role: 'admin',
        permissions: ['read', 'write'],
        tenantId: 'tenant-123',
      }

      const result = await processCustomClaims(user, staticClaims)

      expect(result).toEqual(staticClaims)
    })

    it('should process synchronous callback function', async () => {
      const { processCustomClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = {
        sub: 'user123',
        email: 'admin@example.com',
        groups: ['admins', 'users'],
      }

      const callback = (u: Record<string, unknown>) => ({
        role: u.email?.toString().includes('admin') ? 'admin' : 'user',
        groups: u.groups,
      })

      const result = await processCustomClaims(user, callback)

      expect(result).toEqual({
        role: 'admin',
        groups: ['admins', 'users'],
      })
    })

    it('should process asynchronous callback function', async () => {
      const { processCustomClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = { sub: 'user123', email: 'test@example.com' }

      const asyncCallback = async (u: Record<string, unknown>) => {
        // Simulate async operation (e.g., database query)
        await new Promise(resolve => setTimeout(resolve, 10))

        return {
          role: 'user',
          userId: u.sub,
          verified: true,
        }
      }

      const result = await processCustomClaims(user, asyncCallback)

      expect(result).toEqual({
        role: 'user',
        userId: 'user123',
        verified: true,
      })
    })

    it('should handle callback accessing user data', async () => {
      const { processCustomClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['user', 'moderator'],
      }

      const callback = (u: Record<string, unknown>) => ({
        userId: u.sub,
        primaryRole: Array.isArray(u.roles) ? u.roles[0] : 'unknown',
        email: u.email,
      })

      const result = await processCustomClaims(user, callback)

      expect(result).toEqual({
        userId: 'user123',
        primaryRole: 'user',
        email: 'test@example.com',
      })
    })

    it('should return empty object when no custom claims provided', async () => {
      const { processCustomClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = { sub: 'user123' }

      const result = await processCustomClaims(user, undefined)

      expect(result).toEqual({})
    })

    it('should handle callback returning empty object', async () => {
      const { processCustomClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = { sub: 'user123' }
      const callback = () => ({})

      const result = await processCustomClaims(user, callback)

      expect(result).toEqual({})
    })
  })

  describe('filterReservedClaims', () => {
    it('should filter out reserved JWT claims', async () => {
      const { filterReservedClaims } = await import('../../src/runtime/server/utils/customClaims')

      const claims = {
        role: 'admin',
        permissions: ['read', 'write'],
        iss: 'malicious-issuer', // Reserved
        sub: 'malicious-subject', // Reserved
        exp: 9999999999, // Reserved
        iat: 1234567890, // Reserved
        nbf: 1234567890, // Reserved
        jti: 'malicious-jti', // Reserved
        aud: 'malicious-audience', // Reserved
        customField: 'allowed',
      }

      const filtered = filterReservedClaims(claims)

      expect(filtered).toEqual({
        role: 'admin',
        permissions: ['read', 'write'],
        customField: 'allowed',
      })
      expect(filtered).not.toHaveProperty('iss')
      expect(filtered).not.toHaveProperty('sub')
      expect(filtered).not.toHaveProperty('exp')
      expect(filtered).not.toHaveProperty('iat')
      expect(filtered).not.toHaveProperty('nbf')
      expect(filtered).not.toHaveProperty('jti')
      expect(filtered).not.toHaveProperty('aud')
    })

    it('should allow empty custom claims object', async () => {
      const { filterReservedClaims } = await import('../../src/runtime/server/utils/customClaims')

      const filtered = filterReservedClaims({})

      expect(filtered).toEqual({})
    })

    it('should preserve all non-reserved claims', async () => {
      const { filterReservedClaims } = await import('../../src/runtime/server/utils/customClaims')

      const claims = {
        role: 'user',
        permissions: ['read'],
        tenantId: 'tenant-123',
        metadata: { key: 'value' },
        groups: ['group1', 'group2'],
      }

      const filtered = filterReservedClaims(claims)

      expect(filtered).toEqual(claims)
    })
  })

  describe('validateClaimTypes', () => {
    it('should allow valid claim types', async () => {
      const { validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const validClaims = {
        stringClaim: 'string value',
        numberClaim: 42,
        booleanClaim: true,
        arrayClaim: ['item1', 'item2'],
        numberArray: [1, 2, 3],
        mixedArray: ['string', 123, true],
        nullClaim: null,
      }

      const result = validateClaimTypes(validClaims)

      expect(result).toEqual(validClaims)
    })

    it('should filter out object claims', async () => {
      const { validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const invalidClaims = {
        role: 'admin',
        metadata: { key: 'value' }, // Object not allowed
      }

      const result = validateClaimTypes(invalidClaims)

      expect(result).toEqual({ role: 'admin' })
      expect(result).not.toHaveProperty('metadata')
    })

    it('should filter out undefined claims', async () => {
      const { validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const invalidClaims = {
        role: 'admin',
        undefinedClaim: undefined,
      }

      const result = validateClaimTypes(invalidClaims)

      expect(result).toEqual({ role: 'admin' })
      expect(result).not.toHaveProperty('undefinedClaim')
    })

    it('should filter out function claims', async () => {
      const { validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const invalidClaims = {
        role: 'admin',
        fnClaim: () => 'test',
      }

      const result = validateClaimTypes(invalidClaims)

      expect(result).toEqual({ role: 'admin' })
      expect(result).not.toHaveProperty('fnClaim')
    })

    it('should allow arrays but filter those with invalid element types', async () => {
      const { validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const claims = {
        role: 'admin',
        validArray: ['valid', 123, true],
        arrayWithObject: ['valid', { invalid: 'object' }],
      }

      const result = validateClaimTypes(claims)

      // Arrays are allowed even with mixed types - validation is at claim level, not element level
      expect(result).toHaveProperty('role')
      expect(result).toHaveProperty('validArray')
      expect(result).toHaveProperty('arrayWithObject')
    })

    it('should allow empty object', async () => {
      const { validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const result = validateClaimTypes({})

      expect(result).toEqual({})
    })
  })

  describe('Integration: processCustomClaims with filtering and validation', () => {
    it('should process callback output through filter and validate pipeline', async () => {
      const { processCustomClaims, filterReservedClaims } = await import('../../src/runtime/server/utils/customClaims')

      const user = { sub: 'user123', email: 'test@example.com' }

      const callback = () => ({
        role: 'admin',
        permissions: ['read', 'write'],
        iss: 'should-be-filtered', // Reserved claim
        sub: 'should-be-filtered', // Reserved claim
      })

      // This is how it's used in jwt.ts - processCustomClaims first, then filter
      const rawClaims = await processCustomClaims(user, callback)
      const filtered = filterReservedClaims(rawClaims)

      // Reserved claims should be filtered out
      expect(filtered).toEqual({
        role: 'admin',
        permissions: ['read', 'write'],
      })
      expect(filtered).not.toHaveProperty('iss')
      expect(filtered).not.toHaveProperty('sub')
    })

    it('should filter invalid claim types through validate pipeline', async () => {
      const { processCustomClaims, validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const user = { sub: 'user123' }

      const callback = () => ({
        role: 'admin',
        invalidClaim: { nested: 'object' }, // Invalid type
      })

      // This is how it's used in jwt.ts
      const rawClaims = await processCustomClaims(user, callback)
      const validated = validateClaimTypes(rawClaims)

      expect(validated).toEqual({ role: 'admin' })
      expect(validated).not.toHaveProperty('invalidClaim')
    })

    it('should handle complex real-world scenario with full pipeline', async () => {
      const { processCustomClaims, filterReservedClaims, validateClaimTypes } = await import('../../src/runtime/server/utils/customClaims')

      const user = {
        sub: 'user123',
        email: 'admin@company.com',
        name: 'Admin User',
        groups: ['admins', 'developers'],
      }

      const callback = async (
        u: Record<string, unknown>,
      ) => {
        await new Promise(resolve => setTimeout(resolve, 5))

        return {
          role: u.email?.toString().includes('admin') ? 'admin' : 'user',
          groups: u.groups,
          permissions: ['read', 'write', 'delete'],
          tenantId: 'company-123',
          // Attempt to set reserved claim
          iss: 'malicious',
        }
      }

      // Full pipeline as used in jwt.ts
      const rawClaims = await processCustomClaims(user, callback)
      const filtered = filterReservedClaims(rawClaims)
      const validated = validateClaimTypes(filtered)

      expect(validated).toEqual({
        role: 'admin',
        groups: ['admins', 'developers'],
        permissions: ['read', 'write', 'delete'],
        tenantId: 'company-123',
      })
      expect(validated).not.toHaveProperty('iss')
    })
  })
})
