import { beforeEach, describe, expect, it, vi } from 'vitest'
import task from '../../src/runtime/tasks/cleanup/auth-codes'

const { mockStorage, useStorage } = vi.hoisted(() => {
  const mockStorage = {
    getKeys: vi.fn(),
    getItem: vi.fn(),
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
