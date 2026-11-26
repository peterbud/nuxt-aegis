import { describe, it, expect } from 'vitest'
import { declareSecretSchemas, requiredSecret } from '../../src/secretSchemas'
import type { ModuleOptions } from '../../src/runtime/types'

describe('declareSecretSchemas', () => {
  it('declares unset secrets as required schemas and keeps set values', () => {
    const options: ModuleOptions = {
      token: { secret: '' },
      tokenRefresh: { encryption: { enabled: true } },
      providers: {
        google: { clientId: '', clientSecret: 'kept' },
        github: { clientId: 'id', clientSecret: 'secret' },
      },
    }
    const config = declareSecretSchemas(options) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(config.token.secret).toBe(requiredSecret)
    expect(config.tokenRefresh.encryption.key).toBe(requiredSecret)
    expect(config.providers.google.clientId).toBe(requiredSecret)
    expect(config.providers.google.clientSecret).toBe('kept')
    expect(config.providers.github).toEqual({ clientId: 'id', clientSecret: 'secret' })
    expect(options.token?.secret).toBe('')
  })

  it('leaves the encryption key alone when encryption is disabled', () => {
    const config = declareSecretSchemas({ token: { secret: 's' }, tokenRefresh: { encryption: { enabled: false } } }) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(config.token.secret).toBe('s')
    expect(config.tokenRefresh.encryption.key).toBeUndefined()
  })

  it('validates non-empty strings only', () => {
    const { validate } = requiredSecret['~standard']

    expect(validate('abc')).toEqual({ value: 'abc' })
    expect(validate('')).toHaveProperty('issues')
    expect(validate(undefined)).toHaveProperty('issues')
  })
})
