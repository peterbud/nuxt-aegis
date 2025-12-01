import { describe, it, expect } from 'vitest'
import {
  normalizeEmail,
  validateEmailFormat,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  obfuscateMagicCode,
} from '../../src/runtime/server/utils/password'

describe('Password Utilities', () => {
  describe('normalizeEmail', () => {
    it('should trim and lowercase email', () => {
      expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com')
    })
  })

  describe('validateEmailFormat', () => {
    it('should validate correct email', () => {
      expect(validateEmailFormat('test@example.com').valid).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(validateEmailFormat('invalid-email').valid).toBe(false)
      expect(validateEmailFormat('test@').valid).toBe(false)
      expect(validateEmailFormat('@example.com').valid).toBe(false)
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'MySecurePassword123!'
      const hash = await hashPassword(password)

      expect(hash).toContain(':') // Salt:Key format
      expect(await verifyPassword(password, hash)).toBe(true)
      expect(await verifyPassword('WrongPassword', hash)).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should validate default policy', () => {
      // Default: minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: false
      // Wait, looking at the implementation in password.ts, the defaults are handled in the function arguments or inside.
      // Let's check the implementation again.
      // It seems defaults are applied if policy object is empty, but specific flags default to undefined which is falsy?
      // No, let's check the code.

      /*
      const minLength = policy.minLength ?? 8
      if (policy.requireUppercase && !/[A-Z]/.test(password)) ...
      */

      // So by default (empty object), only minLength is checked.
      // The plan said "default policy: { minLength: 8, requireUppercase: true, ... }" but that's in the config defaults,
      // the utility function takes a policy object. If I pass {}, it uses its internal defaults.
      // The internal defaults in `password.ts` seem to be:
      // minLength = 8.
      // The other checks depend on `policy.requireUppercase` being truthy.
      // So passing {} means only length check.

      expect(validatePasswordStrength('short', {})).toEqual(expect.arrayContaining([expect.stringContaining('at least 8 characters')]))
      expect(validatePasswordStrength('longenough', {})).toBe(true)
    })

    it('should validate custom policy', () => {
      const policy = {
        minLength: 6,
        requireUppercase: true,
        requireNumber: true,
        requireSpecial: true,
      }

      expect(validatePasswordStrength('weak', policy)).toBeInstanceOf(Array)
      expect(validatePasswordStrength('NoNumber!', policy)).toBeInstanceOf(Array)
      expect(validatePasswordStrength('NoSpecial1', policy)).toBeInstanceOf(Array)
      expect(validatePasswordStrength('nouppercase1!', policy)).toBeInstanceOf(Array)
      expect(validatePasswordStrength('Valid1!', policy)).toBe(true)
    })
  })

  describe('obfuscateMagicCode', () => {
    it('should obfuscate code', () => {
      expect(obfuscateMagicCode('123456')).toBe('****56')
    })
  })
})
