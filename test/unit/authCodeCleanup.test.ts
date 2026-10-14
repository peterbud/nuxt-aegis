import { beforeEach, describe, expect, it, vi } from 'vitest'
import task from '../../src/runtime/tasks/cleanup/auth-codes'
import { retrieveAndDeleteAuthCode, storeAuthCode } from '../../src/runtime/server/utils/authCodeStore'
import type { AuthCodeData } from '../../src/runtime/types'

const { mockStorage, useStorage } = vi.hoisted(() => {
  const mockStorage = {
    getKeys: vi.fn(),
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }
  return { mockStorage, useStorage: vi.fn(() => mockStorage) }
})

vi.mock('nitropack/runtime', () => ({
  defineTask: (definition: unknown) => definition,
  useStorage,
}))

vi.mock('../../src/runtime/server/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    security: vi.fn(),
  }),
}))

describe('Authorization code consumption', () => {
  const records = new Map<string, AuthCodeData>()

  beforeEach(() => {
    vi.resetAllMocks()
    records.clear()
    useStorage.mockReturnValue(mockStorage)
    mockStorage.getItem.mockImplementation(async (code: string) => records.get(code) ?? null)
    mockStorage.removeItem.mockImplementation(async (code: string) => {
      records.delete(code)
    })
    records.set('test-code', {
      providerUserInfo: { sub: 'user-123' },
      provider: 'google',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    })
  })

  it('allows exactly one concurrent consumption and rejects subsequent replay', async () => {
    const record = records.get('test-code')
    const results = await Promise.all(Array.from({ length: 20 }, () => retrieveAndDeleteAuthCode('test-code')))

    expect(results.filter(Boolean)).toEqual([record])
    expect(mockStorage.getItem).toHaveBeenCalledTimes(1)
    expect(mockStorage.removeItem).toHaveBeenCalledExactlyOnceWith('test-code')
    await expect(retrieveAndDeleteAuthCode('test-code')).resolves.toBeNull()
  })

  it('allows different codes to be consumed concurrently', async () => {
    const record = records.get('test-code')!
    records.set('other-code', record)

    await expect(Promise.all([
      retrieveAndDeleteAuthCode('test-code'),
      retrieveAndDeleteAuthCode('other-code'),
    ])).resolves.toEqual([record, record])
    expect(records.size).toBe(0)
  })

  it('does not return exchange data until deletion completes', async () => {
    const deletion = Promise.withResolvers<undefined>()
    const record = records.get('test-code')
    mockStorage.removeItem.mockImplementationOnce(async (code: string) => {
      await deletion.promise
      records.delete(code)
    })
    const completed = vi.fn()
    const consumption = retrieveAndDeleteAuthCode('test-code').then((result) => {
      completed()
      return result
    })

    try {
      await vi.waitFor(() => expect(mockStorage.removeItem).toHaveBeenCalledOnce())
      expect(completed).not.toHaveBeenCalled()
      await expect(retrieveAndDeleteAuthCode('test-code')).resolves.toBeNull()
    }
    finally {
      deletion.resolve(undefined)
      await expect(consumption).resolves.toEqual(record)
    }
  })

  it('rejects and deletes expired codes', async () => {
    records.get('test-code')!.expiresAt = Date.now() - 1

    await expect(retrieveAndDeleteAuthCode('test-code')).resolves.toBeNull()
    expect(records.has('test-code')).toBe(false)
  })

  it('releases the guard when a code is missing', async () => {
    mockStorage.getItem.mockResolvedValueOnce(null)

    await expect(retrieveAndDeleteAuthCode('test-code')).resolves.toBeNull()
    await expect(retrieveAndDeleteAuthCode('test-code')).resolves.toEqual(expect.objectContaining({ provider: 'google' }))
  })

  it.each(['getItem', 'removeItem'] as const)('propagates %s failures and releases the guard', async (operation) => {
    mockStorage[operation].mockRejectedValueOnce(new Error('Storage unavailable'))

    await expect(retrieveAndDeleteAuthCode('test-code')).rejects.toThrow('Storage unavailable')
    await expect(retrieveAndDeleteAuthCode('test-code')).resolves.toEqual(expect.objectContaining({ provider: 'google' }))
  })
})

describe('Authorization code cleanup task', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores only exchange data and timestamps without provider credentials', async () => {
    const providerUserInfo = { sub: 'user-123', email: 'test@example.com' }
    const customClaims = { role: 'user' }

    await storeAuthCode('test-code', providerUserInfo, 'google', customClaims, 90)

    expect(useStorage).toHaveBeenCalledWith('authCodeStore')
    expect(mockStorage.setItem).toHaveBeenCalledExactlyOnceWith('test-code', {
      providerUserInfo,
      provider: 'google',
      customClaims,
      createdAt: expect.any(Number),
      expiresAt: expect.any(Number),
    })
    const storedRecord = mockStorage.setItem.mock.calls[0]![1]
    expect(storedRecord.expiresAt - storedRecord.createdAt).toBe(90_000)
  })

  it('deletes expired codes while preserving valid codes and skipping missing records', async () => {
    mockStorage.getKeys.mockResolvedValue(['expired', 'valid', 'missing'])
    mockStorage.getItem.mockResolvedValueOnce({ expiresAt: 0 })
      .mockResolvedValueOnce({ expiresAt: Date.now() + 60_000 })
      .mockResolvedValueOnce(null)

    const result = await task.run({ name: 'cleanup:auth-codes', payload: {}, context: {} })

    expect(task.meta?.name).toBe('cleanup:auth-codes')
    expect(useStorage).toHaveBeenCalledWith('authCodeStore')
    expect(mockStorage.removeItem).toHaveBeenCalledExactlyOnceWith('expired')
    expect(result).toEqual({ result: { deleted: 1 } })
  })

  it('reports zero deletions for an empty store', async () => {
    mockStorage.getKeys.mockResolvedValue([])

    await expect(task.run({ name: 'cleanup:auth-codes', payload: {}, context: {} })).resolves.toEqual({ result: { deleted: 0 } })
    expect(mockStorage.removeItem).not.toHaveBeenCalled()
  })

  it('propagates storage failures instead of reporting success', async () => {
    mockStorage.getKeys.mockRejectedValueOnce(new Error('Storage unavailable'))

    await expect(task.run({ name: 'cleanup:auth-codes', payload: {}, context: {} })).rejects.toThrow('Storage unavailable')
  })
})
