import { beforeEach, describe, expect, it, vi } from 'vitest'

type Ref<T> = { value: T }

const stateMap = new Map<string, Ref<unknown>>()
const navigateToMock = vi.fn()
const fetchMock = vi.fn()

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
        error: vi.fn(),
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
        fetchMock.mockRejectedValue(new Error('No refresh token'))

        const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
        const auth = useAuth()

        await auth.ensureResolved()

        expect(auth.authStatus.value).toBe('guest')
        expect(auth.isResolved.value).toBe(true)
        expect(auth.error.value).toBeNull()
        expect(currentAccessToken).toBeNull()
    })

    it('refresh still exposes refresh failures to callers', async () => {
        fetchMock.mockRejectedValue(new Error('Refresh rejected'))

        const { useAuth } = await import('../../src/runtime/app/composables/useAuth')
        const auth = useAuth()

        await expect(auth.refresh()).rejects.toThrow('Refresh rejected')
        expect(auth.authStatus.value).toBe('guest')
        expect(auth.error.value).toBe('Failed to refresh authentication')
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
})