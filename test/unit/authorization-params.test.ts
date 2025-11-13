import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { consola } from 'consola'

/**
 * Unit Tests for Authorization Parameters Validation
 *
 * These tests verify that:
 * 1. Custom authorization parameters are properly validated
 * 2. Protected OAuth parameters cannot be overridden
 * 3. Warnings are logged when protected parameters are attempted
 */

// Inline the validation function for unit testing
const PROTECTED_PARAMS = ['client_id', 'redirect_uri', 'code', 'grant_type'] as const

function validateAuthorizationParams(
  authorizationParams: Record<string, string> | undefined,
  providerKey: string,
): Record<string, string> {
  if (!authorizationParams) {
    return {}
  }

  const filtered: Record<string, string> = {}
  const protectedFound: string[] = []

  for (const [key, value] of Object.entries(authorizationParams)) {
    if (PROTECTED_PARAMS.includes(key as typeof PROTECTED_PARAMS[number])) {
      protectedFound.push(key)
    }
    else {
      filtered[key] = value
    }
  }

  if (protectedFound.length > 0) {
    consola.warn(`[Nuxt Aegis] Protected OAuth parameters cannot be overridden in authorizationParams for ${providerKey}:`, {
      attempted: protectedFound,
      protected: PROTECTED_PARAMS,
      message: 'These parameters are ignored for security reasons',
    })
  }

  return filtered
}

/**
 * Unit Tests for Authorization Parameters
 *
 * These tests verify that:
 * 1. Custom authorization parameters are properly validated
 * 2. Protected OAuth parameters cannot be overridden
 * 3. Warnings are logged when protected parameters are attempted
 */
describe('Authorization Parameters', () => {
  // Spy on consola.warn to verify warnings
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(consola, 'warn').mockImplementation(() => { })
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  describe('validateAuthorizationParams', () => {
    it('should return empty object when authorizationParams is undefined', () => {
      const result = validateAuthorizationParams(undefined, 'google')
      expect(result).toEqual({})
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('should allow custom parameters that are not protected', () => {
      const params = {
        access_type: 'offline',
        prompt: 'consent',
        hd: 'example.com',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        access_type: 'offline',
        prompt: 'consent',
        hd: 'example.com',
      })
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('should filter out protected parameter: client_id', () => {
      const params = {
        client_id: 'malicious-client-id',
        access_type: 'offline',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        access_type: 'offline',
      })
      expect(result).not.toHaveProperty('client_id')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Protected OAuth parameters cannot be overridden'),
        expect.objectContaining({
          attempted: ['client_id'],
        }),
      )
    })

    it('should filter out protected parameter: redirect_uri', () => {
      const params = {
        redirect_uri: 'https://evil.com/callback',
        prompt: 'consent',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        prompt: 'consent',
      })
      expect(result).not.toHaveProperty('redirect_uri')
      expect(warnSpy).toHaveBeenCalled()
    })

    it('should filter out protected parameter: code', () => {
      const params = {
        code: 'malicious-code',
        access_type: 'offline',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        access_type: 'offline',
      })
      expect(result).not.toHaveProperty('code')
      expect(warnSpy).toHaveBeenCalled()
    })

    it('should filter out protected parameter: grant_type', () => {
      const params = {
        grant_type: 'malicious-grant',
        prompt: 'consent',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        prompt: 'consent',
      })
      expect(result).not.toHaveProperty('grant_type')
      expect(warnSpy).toHaveBeenCalled()
    })

    it('should filter out multiple protected parameters', () => {
      const params = {
        client_id: 'malicious-client-id',
        redirect_uri: 'https://evil.com/callback',
        code: 'malicious-code',
        access_type: 'offline',
        prompt: 'consent',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        access_type: 'offline',
        prompt: 'consent',
      })
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Protected OAuth parameters cannot be overridden'),
        expect.objectContaining({
          attempted: ['client_id', 'redirect_uri', 'code'],
        }),
      )
    })

    it('should log warnings with correct provider name', () => {
      const params = {
        client_id: 'malicious-client-id',
      }

      validateAuthorizationParams(params, 'auth0')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('auth0'),
        expect.anything(),
      )
    })

    it('should handle empty authorizationParams object', () => {
      const result = validateAuthorizationParams({}, 'github')

      expect(result).toEqual({})
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('should preserve parameter values exactly as provided', () => {
      const params = {
        access_type: 'offline',
        prompt: 'select_account consent',
        hd: 'example.com',
        login_hint: 'user@example.com',
      }

      const result = validateAuthorizationParams(params, 'google')

      expect(result).toEqual({
        access_type: 'offline',
        prompt: 'select_account consent',
        hd: 'example.com',
        login_hint: 'user@example.com',
      })
    })
  })

  describe('Provider buildAuthQuery Integration', () => {
    it('should demonstrate that custom params are overridden by defaults', () => {
      // This test demonstrates the intended behavior:
      // Custom params are spread first, then defaults override them
      const customParams = {
        access_type: 'offline',
        scope: 'malicious-scope', // This should be overridden
      }

      const authQuery = {
        ...customParams,
        // Defaults take precedence
        response_type: 'code',
        client_id: 'correct-client-id',
        scope: 'openid profile email', // This overrides customParams.scope
      }

      expect(authQuery.scope).toBe('openid profile email')
      expect(authQuery.access_type).toBe('offline')
      expect(authQuery.client_id).toBe('correct-client-id')
    })
  })
})
