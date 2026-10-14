import { beforeEach, describe, expect, it, vi } from 'vitest'
import authMiddleware from '../../src/runtime/server/middleware/auth'
import ssrAuthPlugin from '../../src/runtime/server/plugins/ssr-auth'

const mocks = vi.hoisted(() => ({
  config: {
    nuxtAegis: { token: { secret: 'test-secret' } },
    public: { nuxtAegis: { authPath: '/auth', enableSSR: true } },
  },
  debug: vi.fn(),
  error: vi.fn(),
  getRouteRules: vi.fn(),
  getRequestHeader: vi.fn(),
  getCookie: vi.fn(),
  verifyToken: vi.fn(),
  getRefreshTokenData: vi.fn(),
}))

vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  useRuntimeConfig: () => mocks.config,
  getRequestURL: (event: { path: string }) => new URL(event.path, 'http://localhost'),
  getRequestHeader: mocks.getRequestHeader,
  getRouteRules: mocks.getRouteRules,
  createError: (details: object) => Object.assign(new Error('Unauthorized'), details),
}))
vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: (plugin: unknown) => plugin }))
vi.mock('h3', () => ({
  getRequestURL: (event: { path: string }) => new URL(event.path, 'http://localhost'),
  getCookie: mocks.getCookie,
}))
vi.mock('../../src/runtime/server/utils/logger', () => ({
  createLogger: () => ({ debug: mocks.debug, error: mocks.error }),
}))
vi.mock('../../src/runtime/server/utils/jwt', () => ({
  verifyToken: mocks.verifyToken,
  generateToken: vi.fn(),
}))
vi.mock('../../src/runtime/server/utils/refreshToken', () => ({
  hashRefreshToken: vi.fn(),
  getRefreshTokenData: mocks.getRefreshTokenData,
}))

function createEvent(path: string) {
  return { path, context: {} } as Parameters<typeof authMiddleware>[0]
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.config.public.nuxtAegis.enableSSR = true
  mocks.getRouteRules.mockResolvedValue({ nuxtAegis: { auth: true } })
  mocks.verifyToken.mockResolvedValue({ sub: 'user-1' })
})

describe('Authentication middleware logging', () => {
  it.each(['/auth/login', '/_nuxt/app.js', '/api/_internal'])('silently skips %s', async (path) => {
    await authMiddleware(createEvent(path))
    expect(mocks.debug).not.toHaveBeenCalled()
    expect(mocks.getRouteRules).not.toHaveBeenCalled()
  })

  it.each(['/_payload.json', '/account/_payload.json', '/media/photo.jpg'])('preserves protection for %s', async (path) => {
    await expect(authMiddleware(createEvent(path))).rejects.toMatchObject({ status: 401 })
    expect(mocks.verifyToken).not.toHaveBeenCalled()
    expect(mocks.debug).toHaveBeenCalledExactlyOnceWith('Evaluating route authentication for URL:', path)
  })

  it('only logs bearer verification when a token is verified', async () => {
    mocks.getRequestHeader.mockReturnValue('Bearer test-token')
    const event = createEvent('/api/private')
    await authMiddleware(event)
    expect(mocks.verifyToken).toHaveBeenCalledExactlyOnceWith('test-token', 'test-secret')
    expect(mocks.debug).toHaveBeenCalledWith('Verifying bearer token for URL:', '/api/private')
    expect(event.context.user).toEqual({ sub: 'user-1' })
  })
})

describe('SSR authentication exclusions', () => {
  async function runSSR(path: string) {
    const hook = vi.fn()
    await ssrAuthPlugin({ hooks: { hook } } as unknown as Parameters<typeof ssrAuthPlugin>[0])
    expect(hook).toHaveBeenCalledWith('request', expect.any(Function))
    await hook.mock.calls[0]![1](createEvent(path))
  }

  it.each(['/auth/login', '/_nuxt/app.js', '/api/private', '/favicon.ico'])('silently skips %s', async (path) => {
    await runSSR(path)
    expect(mocks.debug).not.toHaveBeenCalled()
    expect(mocks.getCookie).not.toHaveBeenCalled()
  })

  it('does not log or read cookies when SSR auth is disabled', async () => {
    mocks.config.public.nuxtAegis.enableSSR = false
    await runSSR('/account')
    expect(mocks.debug).not.toHaveBeenCalled()
    expect(mocks.getCookie).not.toHaveBeenCalled()
  })

  it('still attempts SSR authentication for unlisted payload paths', async () => {
    await runSSR('/account/_payload.json')
    expect(mocks.getCookie).toHaveBeenCalled()
    expect(mocks.debug).toHaveBeenCalledWith('Restoring SSR authentication for URL:', '/account/_payload.json')
  })
})
