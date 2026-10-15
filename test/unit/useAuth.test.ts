import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFetch } from 'ofetch'
import type { NuxtApp } from '#app'

type Ref<T> = { value: T }

const stateMap = new Map<string, Ref<unknown>>()
const navigateToMock = vi.fn()
const fetchMock = vi.fn()
const errorLogMock = vi.fn()
const requestEventMock = vi.fn()
const clientMiddleware = {
  enabled: true,
  global: true,
  publicRoutes: ['/public'],
  redirectTo: '/sign-in',
  loggedOutRedirectTo: '/dashboard',
}

let currentAccessToken: string | null = null

function ref<T>(value: T): Ref<T> {
  return { value }
}

function computed<T>(getter: () => T): { readonly value: T } {
  return {
    get value() {
      return getter()
    },
  }
}

vi.mock('#imports', () => ({
  computed,
  navigateTo: navigateToMock,
  useRuntimeConfig: () => ({
    public: {
      nuxtAegis: {
        authPath: '/auth',
        loginPath: '/auth',
        logoutPath: '/auth/logout',
        refreshPath: '/auth/refresh',
        tokenRefresh: { automaticRefresh: true },
        clientMiddleware,
        redirect: {
          logout: '/',
        },
      },
    },
  }),
  useState: <T>(key: string, init: () => T) => {
    if (!stateMap.has(key)) {
      stateMap.set(key, ref(init()))
    }

    return stateMap.get(key) as Ref<T>
  },
}))

vi.mock('#app', async () => ({
  ...await import('#imports'),
  defineNuxtRouteMiddleware: (middleware: unknown) => middleware,
  defineNuxtPlugin: (plugin: unknown) => plugin,
  useRequestEvent: requestEventMock,
}))

vi.mock('../../src/runtime/app/utils/tokenStore', () => ({
  clearAccessToken: vi.fn(() => {
    currentAccessToken = null
  }),
  getAccessToken: vi.fn(() => currentAccessToken),
  setAccessToken: vi.fn((accessToken: string) => {
    currentAccessToken = accessToken
  }),
}))

vi.mock('../../src/runtime/app/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: errorLogMock,
  }),
}))

vi.mock('../../src/runtime/app/utils/redirectValidation', () => ({
  validateRedirectPath: (path: string) => path,
}))

vi.mock('../../src/runtime/app/utils/tokenUtils', () => ({
  filterTimeSensitiveClaims: <T>(payload: T) => payload,
}))

function createAccessToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.signature`
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

describe('useAuth', () => {
  beforeEach(() => {
    stateMap.clear()
    currentAccessToken = null
    fetchMock.mockReset()
    navigateToMock.mockReset()
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('atob', decodeBase64Url)
    vi.stubGlobal('window', undefined)
    requestEventMock.mockReset()
    clientMiddleware.enabled = true
    clientMiddleware.global = true
  })

  it('starts in unknown state until auth is resolved', async () => {
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')

    const auth = useAuth()

    expect(auth.authStatus.value).toBe('unknown')
    expect(auth.isResolved.value).toBe(false)
    expect(auth.isLoggedIn.value).toBe(false)
  })

  it('ensureResolved shares in-flight startup restoration work', async () => {
    fetchMock.mockResolvedValue({
      accessToken: createAccessToken({
        sub: 'user-123',
        email: 'user@example.com',
      }),
    })

    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()

    await Promise.all([
      auth.ensureResolved(),
      auth.ensureResolved(),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' })
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.isResolved.value).toBe(true)
    expect(auth.user.value?.email).toBe('user@example.com')
  })

  it('ensureResolved settles to guest without surfacing an auth error when no session exists', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('No refresh token'), { statusCode: 401 }))

    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()

    await auth.ensureResolved()

    expect(auth.authStatus.value).toBe('guest')
    expect(auth.isResolved.value).toBe(true)
    expect(auth.error.value).toBeNull()
    expect(currentAccessToken).toBeNull()
    expect(auth.isLoading.value).toBe(false)
    expect(errorLogMock).not.toHaveBeenCalled()
  })

  it('refresh still exposes refresh failures to callers', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('Refresh rejected'), { response: { status: 401 } }))

    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()

    await expect(auth.refresh()).rejects.toThrow('Refresh rejected')
    expect(auth.authStatus.value).toBe('guest')
    expect(auth.error.value).toEqual({ category: 'session_expired', message: 'Session expired or invalid', status: 401 })
  })

  it('ensureResolved uses an existing in-memory access token without calling refresh', async () => {
    currentAccessToken = createAccessToken({
      sub: 'user-456',
      email: 'cached@example.com',
    })

    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()

    await auth.ensureResolved()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.user.value?.email).toBe('cached@example.com')
  })

  it.each([
    { failure: new Error('Offline'), category: 'network_error', status: undefined },
    { failure: { statusCode: 503 }, category: 'server_error', status: 503 },
    { failure: { response: { status: 500 } }, category: 'server_error', status: 500 },
    { failure: { status: 403 }, category: 'forbidden', status: 403 },
  ])('keeps startup unresolved on $category and permits a shared retry', async ({ failure, category, status }) => {
    fetchMock.mockRejectedValueOnce(failure)
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()

    const results = await Promise.allSettled([auth.ensureResolved(), auth.ensureResolved(), auth.refresh()])

    expect(results.every(result => result.status === 'rejected' && result.reason === failure)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(auth.authStatus.value).toBe('unknown')
    expect(auth.isResolved.value).toBe(false)
    expect(auth.isLoading.value).toBe(false)
    expect(auth.error.value).toMatchObject({ category, message: expect.any(String) })
    expect(auth.error.value).toHaveProperty('category', category)
    if (status !== undefined) {
      expect(auth.error.value).toHaveProperty('status', status)
    }

    let completeRetry!: (response: { accessToken: string }) => void
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => {
      completeRetry = resolve
    }))
    const retry = auth.ensureResolved()
    const sharedRetry = auth.ensureResolved()
    expect(auth.error.value).toBeNull()
    expect(auth.isLoading.value).toBe(true)
    completeRetry({ accessToken: createAccessToken({ sub: 'recovered-user' }) })
    await Promise.all([retry, sharedRetry])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.user.value?.sub).toBe('recovered-user')
    expect(auth.error.value).toBeNull()
    expect(auth.isLoading.value).toBe(false)
  })

  it.each([
    { failure: { statusCode: 401 }, category: 'session_expired', invalid: true },
    { failure: new Error('Offline'), category: 'network_error', invalid: false },
    { failure: { statusCode: 503 }, category: 'server_error', invalid: false },
    { failure: { statusCode: 403 }, category: 'forbidden', invalid: false },
  ])('handles an established session $category without falsely renewing its token', async ({ failure, category, invalid }) => {
    const token = createAccessToken({ sub: 'existing-user', email: 'existing@example.com' })
    currentAccessToken = token
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()
    await auth.ensureResolved()
    const user = auth.user.value
    fetchMock.mockRejectedValueOnce(failure)

    await expect(auth.refresh()).rejects.toBe(failure)

    expect(auth.error.value).toMatchObject({ category })
    expect(auth.authStatus.value).toBe(invalid ? 'guest' : 'authenticated')
    expect(auth.user.value).toBe(invalid ? null : user)
    expect(currentAccessToken).toBe(invalid ? null : token)
    expect(auth.isLoading.value).toBe(false)

    fetchMock.mockResolvedValueOnce({ accessToken: createAccessToken({ sub: 'recovered-user' }) })
    await auth.refresh()
    expect(auth.error.value).toBeNull()
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.user.value?.sub).toBe('recovered-user')
  })

  it('does not mistake a claims-update 401 for a rejected refresh token', async () => {
    const token = createAccessToken({ sub: 'existing-user' })
    currentAccessToken = token
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()
    await auth.ensureResolved()
    const failure = { statusCode: 401 }
    fetchMock.mockRejectedValueOnce(failure)

    await expect(auth.refresh({ updateClaims: true })).rejects.toBe(failure)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/auth/update-claims', { method: 'POST' })
    expect(auth.error.value).toMatchObject({ category: 'operation_error', operation: 'update_claims', status: 401 })
    expect(auth.authStatus.value).toBe('authenticated')
    expect(currentAccessToken).toBe(token)
    expect(auth.isLoading.value).toBe(false)
  })

  it.each([{}, { accessToken: 'invalid' }])('rejects an invalid successful response without clearing identity', async (response) => {
    const token = createAccessToken({ sub: 'existing-user' })
    currentAccessToken = token
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()
    await auth.ensureResolved()
    fetchMock.mockResolvedValueOnce(response)

    await expect(auth.refresh()).rejects.toThrow()

    expect(auth.error.value).toMatchObject({ category: 'server_error' })
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.user.value?.sub).toBe('existing-user')
    expect(currentAccessToken).toBe(token)
    expect(auth.isLoading.value).toBe(false)
  })

  it('wraps non-refresh auth-operation errors in the public union', async () => {
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()
    await expect(auth.login('')).rejects.toThrow()
    expect(auth.error.value).toMatchObject({ category: 'operation_error', operation: 'login' })

    fetchMock.mockRejectedValueOnce({ statusCode: 503 })
    await auth.logout()
    expect(auth.error.value).toMatchObject({ category: 'operation_error', operation: 'logout', status: 503 })

    await expect(auth.impersonate('target-user')).rejects.toThrow()
    expect(auth.error.value).toMatchObject({ category: 'operation_error', operation: 'impersonate' })

    await expect(auth.stopImpersonation()).rejects.toThrow()
    expect(auth.error.value).toMatchObject({ category: 'operation_error', operation: 'stop_impersonation' })
  })

  it.each([new Error('Offline'), { statusCode: 503 }, { statusCode: 403 }])('blocks protected navigation on resolution failure %j', async (failure) => {
    fetchMock.mockRejectedValue(failure)
    const { default: middleware } = await import('../../src/runtime/app/middleware/auth-logged-in')
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')

    await expect(middleware({ path: '/account' } as never, {} as never)).rejects.toBe(failure)
    expect(useAuth().authStatus.value).toBe('unknown')
    expect(useAuth().error.value).not.toBeNull()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('exempts global public routes before attempting resolution, but not per-page protection', async () => {
    const failure = new Error('Offline')
    fetchMock.mockRejectedValue(failure)
    const { default: middleware } = await import('../../src/runtime/app/middleware/auth-logged-in')

    await middleware({ path: '/public' } as never, {} as never)
    expect(fetchMock).not.toHaveBeenCalled()
    clientMiddleware.global = false
    await expect(middleware({ path: '/public' } as never, {} as never)).rejects.toBe(failure)
  })

  it.each(['auth-logged-in', 'auth-logged-out'])('skips %s when middleware is disabled', async (name) => {
    clientMiddleware.enabled = false
    const { default: middleware } = await import(`../../src/runtime/app/middleware/${name}.ts`)
    await middleware({ path: '/account' }, {})
    expect(fetchMock).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it.each([
    { authenticated: false, loggedInRedirect: '/sign-in', loggedOutRedirect: undefined },
    { authenticated: true, loggedInRedirect: undefined, loggedOutRedirect: '/dashboard' },
  ])('retains existing route behavior when authenticated=$authenticated', async ({ authenticated, loggedInRedirect, loggedOutRedirect }) => {
    if (authenticated) {
      currentAccessToken = createAccessToken({ sub: 'existing-user' })
    }
    else {
      fetchMock.mockRejectedValue({ statusCode: 401 })
    }
    const { default: loggedIn } = await import('../../src/runtime/app/middleware/auth-logged-in')
    const { default: loggedOut } = await import('../../src/runtime/app/middleware/auth-logged-out')

    await loggedIn({ path: '/account' } as never, {} as never)
    if (loggedInRedirect) {
      expect(navigateToMock).toHaveBeenCalledWith(loggedInRedirect)
    }
    else {
      expect(navigateToMock).not.toHaveBeenCalled()
    }
    navigateToMock.mockClear()
    await loggedOut({ path: '/sign-in' } as never, {} as never)
    if (loggedOutRedirect) {
      expect(navigateToMock).toHaveBeenCalledWith(loggedOutRedirect)
    }
    else {
      expect(navigateToMock).not.toHaveBeenCalled()
    }
  })

  it.each([new Error('Offline'), { statusCode: 503 }, { statusCode: 403 }])('allows logged-out-only navigation without fabricating guest state on %j', async (failure) => {
    fetchMock.mockRejectedValue(failure)
    const { default: middleware } = await import('../../src/runtime/app/middleware/auth-logged-out')
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')

    await middleware({ path: '/sign-in' } as never, {} as never)
    expect(useAuth().authStatus.value).toBe('unknown')
    expect(useAuth().error.value).not.toBeNull()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('contains startup resolution failures and allows a later explicit retry', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 503 })
    Object.assign(fetchMock, { create: vi.fn(() => fetchMock) })
    const { default: plugin } = await import('../../src/runtime/app/plugins/api.client')
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const hook = vi.fn()
    await plugin.setup!({
      $config: { public: { nuxtAegis: { tokenRefresh: { automaticRefresh: true } } } },
      hook,
      runWithContext: (callback: () => unknown) => callback(),
    } as unknown as NuxtApp)

    expect(hook).toHaveBeenCalledWith('app:mounted', expect.any(Function))
    await expect(hook.mock.calls[0]![1]()).resolves.toBeUndefined()
    const auth = useAuth()
    expect(auth.authStatus.value).toBe('unknown')
    expect(auth.error.value).toMatchObject({ category: 'server_error' })
    expect(auth.isLoading.value).toBe(false)

    fetchMock.mockResolvedValueOnce({ accessToken: createAccessToken({ sub: 'recovered-user' }) })
    await auth.ensureResolved()
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.error.value).toBeNull()
  })

  it('preserves SSR identity through hydration and a failed client refresh without renewing a token', async () => {
    requestEventMock.mockReturnValue({ context: { user: { sub: 'ssr-user', role: 'admin' } } })
    const { default: plugin } = await import('../../src/runtime/app/plugins/ssr-state.server')
    await plugin.setup!({} as NuxtApp)
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()
    await auth.ensureResolved()
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockRejectedValueOnce({ statusCode: 503 })
    await expect(auth.refresh()).rejects.toMatchObject({ statusCode: 503 })
    expect(auth.authStatus.value).toBe('authenticated')
    expect(auth.user.value).toMatchObject({ sub: 'ssr-user', role: 'admin' })
    expect(auth.error.value).toMatchObject({ category: 'server_error' })
    expect(currentAccessToken).toBeNull()
  })

  it('does not overwrite unresolved client state during SSR initialization', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 503 })
    const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
    const auth = useAuth()
    await expect(auth.ensureResolved()).rejects.toMatchObject({ statusCode: 503 })
    const error = auth.error.value
    const { default: plugin } = await import('../../src/runtime/app/plugins/ssr-state.server')

    requestEventMock.mockReturnValue({ context: {} })
    await plugin.setup!({} as NuxtApp)
    requestEventMock.mockReturnValue({ context: { user: { sub: 'other-user' } } })
    await plugin.setup!({} as NuxtApp)
    expect(auth.authStatus.value).toBe('unknown')
    expect(auth.user.value).toBeNull()
    expect(auth.error.value).toBe(error)
  })

  describe('API refresh and replay', () => {
    function jsonResponse(status: number, data: unknown = {}) {
      return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
    }

    async function setupApi(automaticRefresh = true) {
      const transport = vi.fn<typeof globalThis.fetch>()
      vi.stubGlobal('$fetch', createFetch({ fetch: transport }))
      const { default: plugin } = await import('../../src/runtime/app/plugins/api.client')
      const result = await plugin.setup!({
        $config: { public: { nuxtAegis: { tokenRefresh: { automaticRefresh }, redirect: { error: '/auth-error' } } } },
        hook: vi.fn(),
        runWithContext: (callback: () => unknown) => callback(),
      } as unknown as NuxtApp)
      if (!result?.provide) {
        throw new Error('API plugin did not provide a client')
      }
      const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
      const auth = useAuth()
      currentAccessToken = createAccessToken({ sub: 'existing-user' })
      await auth.ensureResolved()
      return { api: result.provide.api, transport, auth }
    }

    it('replays only after successful refresh, attaching the new token', async () => {
      const { api, transport, auth } = await setupApi()
      const token = createAccessToken({ sub: 'refreshed-user' })
      transport.mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: token }))
        .mockResolvedValueOnce(jsonResponse(200, { success: true }))

      await expect(api('/private')).resolves.toEqual({ success: true })
      expect(transport).toHaveBeenCalledTimes(3)
      expect(transport.mock.calls.map(([request]) => request)).toEqual(['/private', '/auth/refresh', '/private'])
      expect(new Headers(transport.mock.calls[2]![1]?.headers).get('Authorization')).toBe(`Bearer ${token}`)
      expect(auth.user.value?.sub).toBe('refreshed-user')
      expect(auth.error.value).toBeNull()
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('replays a POST at most once with its method and JSON body intact', async () => {
      const { api, transport } = await setupApi()
      const token = createAccessToken({ sub: 'refreshed-user' })
      const body = { title: 'New item', nested: { enabled: true } }
      transport.mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: token }))
        .mockResolvedValueOnce(jsonResponse(401))

      await expect(api('/private', { method: 'POST', body, retry: 5 })).rejects.toMatchObject({ status: 401 })

      expect(transport.mock.calls.map(([request]) => request)).toEqual(['/private', '/auth/refresh', '/private'])
      for (const callIndex of [0, 2]) {
        const options = transport.mock.calls[callIndex]![1]!
        expect(options.method).toBe('POST')
        expect(options.body).toBe(JSON.stringify(body))
        expect(new Headers(options.headers).get('content-type')).toBe('application/json')
      }
      expect(new Headers(transport.mock.calls[2]![1]?.headers).get('Authorization')).toBe(`Bearer ${token}`)
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it.each([
      { status: undefined, category: 'network_error' },
      { status: 503, category: 'server_error' },
      { status: 403, category: 'forbidden' },
      { status: 401, category: 'session_expired' },
    ])('propagates refresh $category without replaying even when extra retries are requested', async ({ status, category }) => {
      const { api, transport, auth } = await setupApi()
      const user = auth.user.value
      const token = currentAccessToken
      transport.mockResolvedValueOnce(jsonResponse(401))
      if (status === undefined) {
        transport.mockRejectedValueOnce(new Error('Offline'))
      }
      else {
        transport.mockResolvedValueOnce(jsonResponse(status))
      }

      await expect(api('/private', { retry: 5 })).rejects.toMatchObject({ request: '/auth/refresh' })
      expect(transport).toHaveBeenCalledTimes(2)
      expect(auth.error.value).toMatchObject({ category })
      if (status === 401) {
        expect(auth.authStatus.value).toBe('guest')
        expect(auth.user.value).toBeNull()
        expect(currentAccessToken).toBeNull()
        expect(navigateToMock).toHaveBeenCalledExactlyOnceWith(`/auth-error?error=token_refresh_failed&error_description=${encodeURIComponent('Session expired. Please log in again.')}`)
      }
      else {
        expect(auth.authStatus.value).toBe('authenticated')
        expect(auth.user.value).toBe(user)
        expect(currentAccessToken).toBe(token)
        expect(navigateToMock).not.toHaveBeenCalled()
      }
    })

    it('does not refresh again or invalidate the session when the replay returns 401', async () => {
      const { api, transport, auth } = await setupApi()
      const token = createAccessToken({ sub: 'refreshed-user' })
      transport.mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: token }))
        .mockResolvedValueOnce(jsonResponse(401))

      await expect(api('/private', { retry: 5 })).rejects.toMatchObject({ status: 401, request: '/private' })
      expect(transport).toHaveBeenCalledTimes(3)
      expect(auth.authStatus.value).toBe('authenticated')
      expect(currentAccessToken).toBe(token)
      expect(auth.error.value).toBeNull()
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('does not replay an invalid successful refresh response', async () => {
      const { api, transport, auth } = await setupApi()
      transport.mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(200))

      await expect(api('/private')).rejects.toThrow('Invalid token refresh response')
      expect(transport).toHaveBeenCalledTimes(2)
      expect(auth.authStatus.value).toBe('authenticated')
      expect(auth.error.value).toMatchObject({ category: 'server_error' })
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('does not refresh or replay when automatic refresh is disabled', async () => {
      const { api, transport } = await setupApi(false)
      transport.mockResolvedValueOnce(jsonResponse(401))

      await expect(api('/private', { retry: 5 })).rejects.toMatchObject({ status: 401, request: '/private' })
      expect(transport).toHaveBeenCalledTimes(1)
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it.each([200, 401, 503])('shares concurrent refresh work and redirects only once for rejection (%i)', async (status) => {
      const { api, transport, auth } = await setupApi()
      const token = createAccessToken({ sub: 'refreshed-user' })
      let completeRefresh!: (response: Response) => void
      const refreshResponse = new Promise<Response>((resolve) => {
        completeRefresh = resolve
      })
      transport.mockImplementation(async (request, options) => {
        if (request === '/auth/refresh') {
          return refreshResponse
        }
        return new Headers(options?.headers).get('Authorization') === `Bearer ${token}`
          ? jsonResponse(200, { success: true })
          : jsonResponse(401)
      })

      const resultsPromise = Promise.allSettled([api('/first'), api('/second')])
      await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(3))
      completeRefresh(jsonResponse(status, status === 200 ? { accessToken: token } : {}))
      const results = await resultsPromise

      expect(transport.mock.calls.filter(([request]) => request === '/auth/refresh')).toHaveLength(1)
      expect(results.every(result => result.status === (status === 200 ? 'fulfilled' : 'rejected'))).toBe(true)
      expect(transport).toHaveBeenCalledTimes(status === 200 ? 5 : 3)
      expect(navigateToMock).toHaveBeenCalledTimes(status === 401 ? 1 : 0)
      expect(auth.authStatus.value).toBe(status === 401 ? 'guest' : 'authenticated')

      if (status === 503) {
        transport.mockResolvedValueOnce(jsonResponse(401))
          .mockResolvedValueOnce(jsonResponse(200, { accessToken: token }))
          .mockResolvedValueOnce(jsonResponse(200, { success: true }))
        await expect(api('/later')).resolves.toEqual({ success: true })
        expect(transport.mock.calls.filter(([request]) => request === '/auth/refresh')).toHaveLength(2)
        expect(auth.error.value).toBeNull()
      }
    })
  })
})
