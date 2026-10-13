import { beforeEach, describe, expect, it, vi } from 'vitest'
import task from '../../src/runtime/tasks/cleanup/auth-codes'
import { storeAuthCode } from '../../src/runtime/server/utils/authCodeStore'

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
