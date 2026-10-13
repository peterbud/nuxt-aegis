import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequestEvent } from 'nuxt/server'
import { defineOAuthEventHandler, defineOAuthProvider, type OAuthProviderImplementation } from '../../src/runtime/server/providers/oauthBase'
import { oauthTransactions, OAUTH_TRANSACTION_TTL } from '../../src/runtime/server/utils/oauthTransaction'

const mocks = vi.hoisted(() => ({
  runtime: { nuxtAegis: { oauthTransaction: { driver: 'memory', capacity: 10_000, trustProxy: false } } },
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  fetch: vi.fn(),
  userInfo: vi.fn(async (user: Record<string, unknown>) => user),
  persist: vi.fn(),
  success: vi.fn(),
  serverHook: vi.fn(),
  storeCode: vi.fn(),
}))

vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  useRuntimeConfig: () => mocks.runtime,
  getRequestURL: (event: { request: Request }, options: { xForwardedProto?: boolean } = {}) => {
    const url = new URL(event.request.url)
    if (options.xForwardedProto && event.request.headers.get('x-forwarded-proto') === 'https') url.protocol = 'https:'
    return url
  },
  getQuery: (event: { request: Request }) => Object.fromEntries(new URL(event.request.url).searchParams),
  getRequestHeader: (event: { request: Request }, name: string) => event.request.headers.get(name),
  parseCookies: (event: { request: Request }) => Object.fromEntries((event.request.headers.get('cookie') || '').split(';').filter(Boolean).map((part) => {
    const [name, value] = part.trim().split('=')
    return [name, value]
  })),
  setCookie: mocks.setCookie,
  deleteCookie: mocks.deleteCookie,
  sendRedirect: (_event: unknown, location: string) => ({ location }),
  createError: (details: { status: number, message: string }) => Object.assign(new Error(details.message), details),
  isNuxtError: (error: { status?: number }) => Boolean(error.status),
  useServerHooks: () => ({ callHook: mocks.serverHook }),
}))
vi.mock('../../src/runtime/server/utils/logger', () => ({ createLogger: () => ({ warn: vi.fn(), error: vi.fn(), security: vi.fn() }) }))
vi.mock('../../src/runtime/server/utils/authCodeStore', () => ({ generateAuthCode: () => 'aegis-code', storeAuthCode: mocks.storeCode }))
vi.mock('../../src/runtime/server/utils/handler', () => ({ useAegisHandler: () => ({ onUserPersist: mocks.persist }) }))

const provider = defineOAuthProvider({
  runtimeConfigKey: 'google',
  defaultConfig: {},
  authorizeUrl: 'https://provider.test/authorize',
  tokenUrl: 'https://provider.test/token',
  userInfoUrl: 'https://provider.test/user',
  extractUser: user => user as Record<string, unknown>,
  buildAuthQuery: (config, redirectUri, state) => ({ client_id: config.clientId!, redirect_uri: redirectUri, state: state! }),
  buildTokenBody: (_config, code, redirectUri) => ({ code, redirect_uri: redirectUri }),
})

function handler(overrides: Record<string, string> = {}, implementation: OAuthProviderImplementation = provider) {
  return defineOAuthEventHandler(implementation, {
    config: { clientId: 'client', clientSecret: 'secret', ...overrides },
    onUserInfo: mocks.userInfo,
    onSuccess: mocks.success,
  })
}

async function request(path: string, cookie = '', headers: Record<string, string> = {}, route = handler()) {
  const event = { request: new Request(new URL(path, 'http://app.test'), { headers: { cookie, ...headers } }) } as unknown as RequestEvent
  return await route(event) as unknown as { location: string }
}

async function initiate(path = '/auth/google', headers: Record<string, string> = {}, route = handler()) {
  const response = await request(path, '', headers, route)
  const state = new URL(response.location).searchParams.get('state')!
  const [, name, proof] = mocks.setCookie.mock.calls.find(call => String(call[1]).includes(`${state}.`))!
  return { state, cookie: `${name}=${proof}`, name, proof }
}

function expectNoSideEffects() {
  for (const effect of [mocks.fetch, mocks.userInfo, mocks.persist, mocks.success, mocks.serverHook, mocks.storeCode]) {
    expect(effect).not.toHaveBeenCalled()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.runtime.nuxtAegis.oauthTransaction = { driver: 'memory', capacity: 10_000, trustProxy: false }
  mocks.fetch.mockImplementation(async (url: string) => url.endsWith('/token') ? { access_token: 'provider-token' } : { sub: 'user' })
  vi.stubGlobal('$fetch', mocks.fetch)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('shared OAuth handler correlation', () => {
  it('generates state without metadata and enforces it even against a provider builder override', async () => {
    const route = handler({}, { ...provider, buildAuthQuery: () => ({ state: 'attacker' }) })
    const transaction = await initiate('/auth/google', {}, route)
    expect(transaction.state).toMatch(/^[\w-]{43}$/)
    expect(transaction.state).not.toBe(transaction.proof)
    expect(mocks.setCookie.mock.calls[0]?.[3]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 600 })
  })

  it('restores stored redirect metadata, ignores callback metadata, invokes hooks, and clears the cookie', async () => {
    const transaction = await initiate('/auth/google?redirectTo=/account&state=application')
    const response = await request(`/auth/google?code=provider-code&state=${transaction.state}&redirectTo=https://evil.test`, transaction.cookie)
    expect(new URL(response.location).searchParams.get('redirectTo')).toBe('/account')
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    for (const effect of [mocks.userInfo, mocks.persist, mocks.success, mocks.serverHook, mocks.storeCode]) expect(effect).toHaveBeenCalledOnce()
    expect(mocks.deleteCookie).toHaveBeenCalledWith(expect.anything(), transaction.name, expect.objectContaining({ path: '/', secure: false }))
    mocks.fetch.mockClear()
    await request(`/auth/google?code=provider-code&state=${transaction.state}`, transaction.cookie)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it.each(['', '&state=', '&state=forged', '&state=first&state=second', '&code=', '&error=denied&error=again'])('rejects malformed callbacks %s before side effects', async (suffix) => {
    const response = await request(`/auth/google?code=provider-code${suffix}`)
    expect(response.location).toContain('error=authentication_failed')
    expectNoSideEffects()
  })

  it('rejects missing, wrong, or repeated proof without consuming a legitimate transaction', async () => {
    const transaction = await initiate()
    const other = await initiate()
    const callback = `/auth/google?code=provider-code&state=${transaction.state}`
    for (const cookie of ['', `${transaction.name}=${other.proof}`, `${transaction.cookie}; ${transaction.cookie}`]) {
      expect((await request(callback, cookie)).location).toContain('error=')
      expectNoSideEffects()
    }
    expect((await request(callback, transaction.cookie)).location).toContain('code=aegis-code')
  })

  it.each(['provider', 'client', 'redirect'])('rejects wrong %s context without consuming the transaction', async (field) => {
    const transaction = await initiate()
    const route = field === 'provider'
      ? handler({}, { ...provider, runtimeConfigKey: 'mock' })
      : handler(field === 'client' ? { clientId: 'other' } : { redirectUri: 'https://other.test/callback' })
    const callback = `/auth/google?code=provider-code&state=${transaction.state}`
    expect((await request(callback, transaction.cookie, {}, route)).location).toContain('error=')
    expectNoSideEffects()
    expect((await request(callback, transaction.cookie)).location).toContain('code=aegis-code')
  })

  it('rejects expired transactions before side effects', async () => {
    vi.useFakeTimers()
    const transaction = await initiate()
    vi.advanceTimersByTime(OAUTH_TRANSACTION_TTL)
    expect((await request(`/auth/google?code=provider-code&state=${transaction.state}`, transaction.cookie)).location).toContain('error=')
    expectNoSideEffects()
  })

  it('consumes correlated denial and clears its cookie without token exchange', async () => {
    const transaction = await initiate()
    await request(`/auth/google?error=access_denied&state=${transaction.state}`, transaction.cookie)
    expect(mocks.deleteCookie).toHaveBeenCalledOnce()
    expectNoSideEffects()
    await request(`/auth/google?code=provider-code&state=${transaction.state}`, transaction.cookie)
    expectNoSideEffects()
  })

  it('consumes the transaction even when provider exchange fails', async () => {
    const transaction = await initiate()
    mocks.fetch.mockRejectedValueOnce(new Error('provider unavailable'))
    const callback = `/auth/google?code=provider-code&state=${transaction.state}`
    expect((await request(callback, transaction.cookie)).location).toContain('error=')
    expect(mocks.fetch).toHaveBeenCalledOnce()
    await request(callback, transaction.cookie)
    expect(mocks.fetch).toHaveBeenCalledOnce()
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it('supports independent parallel attempts and enforces eight pending cookies', async () => {
    const attempts = await Promise.all(Array.from({ length: 8 }, () => initiate()))
    const cookie = attempts.map(attempt => attempt.cookie).join('; ')
    expect((await request('/auth/google', cookie)).location).toContain('error=')
    expect(mocks.setCookie).toHaveBeenCalledTimes(8)
    for (const attempt of attempts) expect((await request(`/auth/google?code=provider-code&state=${attempt.state}`, cookie)).location).toContain('code=aegis-code')
  })

  it('prunes expired browser cookies before applying the bound', async () => {
    vi.useFakeTimers()
    const attempts = await Promise.all(Array.from({ length: 8 }, () => initiate()))
    vi.advanceTimersByTime(OAUTH_TRANSACTION_TTL)
    const response = await request('/auth/google', attempts.map(attempt => attempt.cookie).join('; '))
    expect(response.location).toContain('provider.test')
    expect(mocks.deleteCookie).toHaveBeenCalledTimes(8)
  })

  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%00'])('rejects unsafe initial redirect %s', async (redirect) => {
    expect((await request(`/auth/google?redirectTo=${encodeURIComponent(redirect)}`)).location).toContain('error=')
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expectNoSideEffects()
  })

  it.each(['state=&state=x', 'redirectTo=/a&redirectTo=/b', 'state=', 'error=', 'code='])('rejects malformed initiation or callback %s', async (query) => {
    expect((await request(`/auth/google?${query}`)).location).toContain('error=')
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expectNoSideEffects()
  })

  it('uses secure host cookies on HTTPS and trusts forwarded protocol only when explicitly enabled', async () => {
    await initiate('https://app.test/auth/google')
    expect(mocks.setCookie.mock.calls.at(-1)?.[1]).toMatch(/^__Host-/)
    expect(mocks.setCookie.mock.calls.at(-1)?.[3]).toMatchObject({ secure: true, path: '/' })
    await initiate('/auth/google', { 'x-forwarded-proto': 'https' })
    expect(mocks.setCookie.mock.calls.at(-1)?.[3]).toMatchObject({ secure: false })
    mocks.runtime.nuxtAegis.oauthTransaction.trustProxy = true
    await initiate('/auth/google', { 'x-forwarded-proto': 'https' })
    expect(mocks.setCookie.mock.calls.at(-1)?.[3]).toMatchObject({ secure: true })
  })

  it('fails closed on unsupported storage, invalid capacity, and store failures', async () => {
    mocks.runtime.nuxtAegis.oauthTransaction.driver = 'redis'
    expect((await request('/auth/google')).location).toContain('error=')
    mocks.runtime.nuxtAegis.oauthTransaction.driver = 'memory'
    mocks.runtime.nuxtAegis.oauthTransaction.capacity = 0
    expect((await request('/auth/google')).location).toContain('error=')
    mocks.runtime.nuxtAegis.oauthTransaction.capacity = 10_000
    const spy = vi.spyOn(oauthTransactions, 'create').mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect((await request('/auth/google')).location).toContain('error=')
    spy.mockRestore()
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expectNoSideEffects()
  })
})
