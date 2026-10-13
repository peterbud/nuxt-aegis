import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOAuthTransactionStore, isOAuthGeneratedValue, OAUTH_TRANSACTION_TTL, validateOAuthRedirect } from '../../src/runtime/server/utils/oauthTransaction'

const context = { provider: 'google', clientId: 'client', redirectUri: 'https://app.test/auth/google' }

afterEach(() => vi.useRealTimers())

describe('OAuth transactions', () => {
  it('creates independent random state and proof, preserving metadata', () => {
    const store = createOAuthTransactionStore()
    const first = store.create(context, { redirectTo: '/account', applicationState: 'caller' })
    const second = store.create(context)
    expect(isOAuthGeneratedValue(first.state)).toBe(true)
    expect(isOAuthGeneratedValue(first.proof)).toBe(true)
    expect(new Set([first.state, first.proof, second.state, second.proof]).size).toBe(4)
    const record = store.consume(first.state, first.proof, context)
    expect(record).toMatchObject({ ...context, redirectTo: '/account', applicationState: 'caller' })
    expect(record).not.toHaveProperty('proof')
    expect(record?.proofHash).not.toEqual(first.proof)
  })

  it('allows exactly one concurrent consume', async () => {
    const store = createOAuthTransactionStore()
    const transaction = store.create(context)
    const results = await Promise.all(Array.from({ length: 20 }, async () => store.consume(transaction.state, transaction.proof, context)))
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  it.each(['provider', 'clientId', 'redirectUri'] as const)('does not consume a mismatched %s', (field) => {
    const store = createOAuthTransactionStore()
    const transaction = store.create(context)
    expect(store.consume(transaction.state, transaction.proof, { ...context, [field]: 'other' })).toBeUndefined()
    expect(store.consume(transaction.state, transaction.proof, context)).toBeDefined()
  })

  it('does not consume forged proofs or malformed states', () => {
    const store = createOAuthTransactionStore()
    const transaction = store.create(context)
    expect(store.consume(transaction.state, store.create(context).proof, context)).toBeUndefined()
    expect(store.consume('', transaction.proof, context)).toBeUndefined()
    expect(store.consume(transaction.state, transaction.proof, context)).toBeDefined()
  })

  it('expires records and prunes capacity without evicting valid transactions', () => {
    vi.useFakeTimers()
    const store = createOAuthTransactionStore(1)
    const transaction = store.create(context)
    expect(() => store.create(context)).toThrow('unavailable')
    vi.advanceTimersByTime(OAUTH_TRANSACTION_TTL)
    expect(store.consume(transaction.state, transaction.proof, context)).toBeUndefined()
    expect(() => store.create(context)).not.toThrow()
    vi.advanceTimersByTime(OAUTH_TRANSACTION_TTL)
    expect(() => store.create(context)).not.toThrow()
  })

  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil', '/%2fevil', '/a\n', '/%00', '/%zz', '/..//evil.test'])('rejects ambiguous redirect %s', (value) => {
    expect(() => validateOAuthRedirect(value)).toThrow()
  })

  it.each(['/account', '/account?tab=profile', '/a#section'])('accepts local redirect %s', (value) => {
    expect(validateOAuthRedirect(value)).toBe(value)
  })
})
