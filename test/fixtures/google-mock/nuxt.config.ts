import MyModule from '../../../src/module'
import { testViteConfig } from '../test.config'

export default defineNuxtConfig({
  ...testViteConfig,
  modules: [
    MyModule,
  ],
  nuxtAegis: {
    token: {
      secret: 'test_secret_key_for_jwt_signing_min_32_chars',
      expiresIn: '15m',
    },
    impersonation: {
      enabled: true,
      tokenExpiration: 900,
      originalUserLookupClaim: 'userId',
    },
    tokenRefresh: {
      enabled: true,
      cookie: {
        maxAge: 604800, // 7 days in seconds
      },
    },
    providers: {
      mock: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        defaultUser: 'default',
        authorizationParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        mockUsers: {
          default: {
            sub: 'mock-user-12345',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            permissions: ['read', 'write'],
            userId: 'default-db-user-12345',
          },
          admin: {
            sub: 'mock-admin-001',
            email: 'admin@paprbck.local',
            name: 'Admin User',
            role: 'ADMIN',
            permissions: ['impersonate'],
            userId: '91B9433E-F36B-1410-8782-0040B859207F',
            subscriptionTier: 'PRO',
            subscriptionStatus: 'active',
            preferredLanguage: 'de',
          },
          alice: {
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
          },
        },
      },
    },
    logging: {
      level: 'silent',
    },
  },
})
