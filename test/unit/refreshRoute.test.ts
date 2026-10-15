import { beforeEach, describe, expect, it, vi } from 'vitest'
import refreshHandler from '../../src/runtime/server/routes/refresh.post'

const mocks = vi.hoisted(() => ({
  config: {
    nuxtAegis: {
      token: { secret: 'test-secret' },
      tokenRefresh: { rotationEnabled: true, cookie: { cookieName: 'refresh-cookie' } },
    },
  },
  getCookie: vi.fn(),
  getRequestHeader: vi.fn(),
  verifyToken: vi.fn(),
  generateToken: vi.fn(),
  getRefreshTokenData: vi.fn(),
  hashRefreshToken: vi.fn(),
  generateAndStoreRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  clearToken: vi.fn(),
  setRefreshTokenCookie: vi.fn(),
  error: vi.fn(),
}))

vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  useRuntimeConfig: () => mocks.config,
  getCookie: mocks.getCookie,
  getRequestHeader: mocks.getRequestHeader,
  createError: (details: { message: string }) => Object.assign(new Error(details.message), details),
}))
vi.mock('../../src/runtime/server/utils/jwt', () => ({
  verifyToken: mocks.verifyToken,
  generateToken: mocks.generateToken,
}))
vi.mock('../../src/runtime/server/utils/refreshToken', () => ({
  getRefreshTokenData: mocks.getRefreshTokenData,
  hashRefreshToken: mocks.hashRefreshToken,
  generateAndStoreRefreshToken: mocks.generateAndStoreRefreshToken,
  revokeRefreshToken: mocks.revokeRefreshToken,
}))
vi.mock('../../src/runtime/server/utils/cookies', () => ({
  clearToken: mocks.clearToken,
  setRefreshTokenCookie: mocks.setRefreshTokenCookie,
}))
vi.mock('../../src/runtime/server/utils/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), error: mocks.error }),
}))

const event = {} as Parameters<typeof refreshHandler>[0]

beforeEach(() => {
  vi.resetAllMocks()
  mocks.config.nuxtAegis.token.secret = 'test-secret'
  mocks.config.nuxtAegis.tokenRefresh.rotationEnabled = true
  mocks.getCookie.mockReturnValue('secret-refresh-token')
  mocks.hashRefreshToken.mockReturnValue('hashed-refresh-token')
  mocks.getRefreshTokenData.mockResolvedValue({
    providerUserInfo: { sub: 'user-123' },
    provider: 'mock',
    customClaims: { role: 'admin' },
    expiresAt: Date.now() + 60_000,
  })
  mocks.generateToken.mockResolvedValue('new-access-token')
  mocks.generateAndStoreRefreshToken.mockResolvedValue('rotated-refresh-token')
})

describe('Refresh failure categories', () => {
  it('quietly rejects a missing session and clears its cookie', async () => {
    mocks.getCookie.mockReturnValue(undefined)
    await expect(refreshHandler(event)).rejects.toMatchObject({ status: 401, message: 'Invalid or expired session' })
    expect(mocks.clearToken).toHaveBeenCalledWith(event, mocks.config.nuxtAegis.tokenRefresh.cookie)
    expect(mocks.getRefreshTokenData).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'unknown', stored: null },
    { name: 'revoked', stored: { isRevoked: true, expiresAt: Date.now() + 60_000 } },
    { name: 'expired', stored: { expiresAt: 1 } },
  ])('rejects a $name refresh token and clears its cookie', async ({ stored }) => {
    mocks.getRefreshTokenData.mockResolvedValue(stored)
    await expect(refreshHandler(event)).rejects.toMatchObject({ status: 401, message: 'Invalid or expired session' })
    expect(mocks.clearToken).toHaveBeenCalledOnce()
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.generateToken).not.toHaveBeenCalled()
  })

  it('preserves an impersonated session cookie when refresh is forbidden', async () => {
    mocks.getRequestHeader.mockReturnValue('Bearer impersonated-access-token')
    mocks.verifyToken.mockResolvedValue({ impersonation: { originalUserSub: 'original-user' } })
    await expect(refreshHandler(event)).rejects.toMatchObject({ status: 403 })
    expect(mocks.clearToken).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.getRefreshTokenData).not.toHaveBeenCalled()
  })

  it('returns a generic configuration error without clearing the cookie', async () => {
    mocks.config.nuxtAegis.token.secret = ''
    await expect(refreshHandler(event)).rejects.toMatchObject({ status: 500, message: 'Token refresh failed' })
    expect(mocks.clearToken).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledOnce()
  })

  it.each([
    { stage: 'storage', status: 503 },
    { stage: 'generation', status: 500 },
    { stage: 'rotation', status: 500 },
    { stage: 'revocation', status: 500 },
  ])('retains the cookie and redacts unexpected $stage failures', async ({ stage, status }) => {
    const failure = Object.assign(new Error('secret-refresh-token internal storage detail'), { statusCode: status })
    const failingOperation = {
      storage: mocks.getRefreshTokenData,
      generation: mocks.generateToken,
      rotation: mocks.generateAndStoreRefreshToken,
      revocation: mocks.revokeRefreshToken,
    }[stage]!
    failingOperation.mockRejectedValueOnce(failure)
    await expect(refreshHandler(event)).rejects.toMatchObject({ status, message: 'Token refresh failed' })
    expect(mocks.clearToken).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith('Unexpected token refresh failure')
  })

  it('normalizes ordinary exceptions to 500 without clearing the cookie', async () => {
    mocks.getRefreshTokenData.mockRejectedValueOnce(new Error('Storage unavailable'))
    await expect(refreshHandler(event)).rejects.toMatchObject({ status: 500, message: 'Token refresh failed' })
    expect(mocks.clearToken).not.toHaveBeenCalled()
  })

  it.each([true, false])('preserves successful refresh with rotation=%s', async (rotationEnabled) => {
    mocks.config.nuxtAegis.tokenRefresh.rotationEnabled = rotationEnabled
    await expect(refreshHandler(event)).resolves.toMatchObject({ success: true, accessToken: 'new-access-token' })
    expect(mocks.clearToken).not.toHaveBeenCalled()
    expect(mocks.setRefreshTokenCookie).toHaveBeenCalledWith(event, rotationEnabled ? 'rotated-refresh-token' : 'secret-refresh-token', mocks.config.nuxtAegis.tokenRefresh.cookie)
    expect(mocks.revokeRefreshToken).toHaveBeenCalledTimes(rotationEnabled ? 1 : 0)
  })
})
