import { defineAegisHandler } from '#imports'
import { useServerHooks } from 'nuxt/server'

const usersByLookupId: Record<string, Record<string, unknown>> = {
  '91B9433E-F36B-1410-8782-0040B859207F': {
    sub: 'mock-admin-001',
    email: 'admin@paprbck.local',
    name: 'Admin User',
    role: 'ADMIN',
    permissions: ['impersonate'],
    userId: '91B9433E-F36B-1410-8782-0040B859207F',
    subscriptionTier: 'PRO',
    subscriptionStatus: 'active',
    preferredLanguage: 'de',
    provider: 'mock',
  },
  '4C2E433E-F36B-1410-8780-0040B859207F': {
    sub: '4C2E433E-F36B-1410-8780-0040B859207F',
    email: 'alice@paprbck.dev',
    name: 'Alice Johnson',
    userName: 'alice',
    role: 'USER',
    permissions: ['read'],
    userId: '4C2E433E-F36B-1410-8780-0040B859207F',
    subscriptionTier: 'FREE',
    subscriptionStatus: 'active',
    preferredLanguage: 'de',
    provider: 'mock',
  },
}

export default defineNitroPlugin(() => {
  useServerHooks().hook('nuxt-aegis:success', async ({ event }) => {
    await Promise.resolve()
    event.res.headers.set('x-aegis-hook-order', `${event.res.headers.get('x-aegis-hook-order')},first`)
  })
  useServerHooks().hook('nuxt-aegis:success', ({ event }) => {
    event.res.headers.set('x-aegis-hook-order', `${event.res.headers.get('x-aegis-hook-order')},second`)
  })
  useServerHooks().hook('nuxt-aegis:impersonate:start', ({ event }) => {
    event.res.headers.set('x-aegis-impersonation-hook', 'start')
  })
  useServerHooks().hook('nuxt-aegis:impersonate:end', ({ event }) => {
    event.res.headers.set('x-aegis-impersonation-hook', 'end')
  })
  defineAegisHandler({
    impersonation: {
      canImpersonate: requester => requester.role === 'ADMIN',
      fetchTarget: async targetId => usersByLookupId[targetId] || null,
    },
  })
})
