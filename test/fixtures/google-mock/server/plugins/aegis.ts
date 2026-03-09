import { defineAegisHandler } from '../../../../../src/runtime/server/utils/handler'

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
  defineAegisHandler({
    impersonation: {
      canImpersonate: requester => requester.role === 'ADMIN',
      fetchTarget: async targetId => usersByLookupId[targetId] || null,
    },
  })
})
