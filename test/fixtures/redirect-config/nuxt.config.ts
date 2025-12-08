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
    tokenRefresh: {
      enabled: true,
      cookie: {
        maxAge: 604800, // 7 days in seconds
      },
    },
    redirect: {
      logout: '/custom-logout',
      success: '/custom-success',
      error: '/custom-error',
    },
    providers: {
      mock: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        defaultUser: 'default',
        mockUsers: {
          default: {
            sub: 'mock-user-12345',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
          },
        },
      },
    },
    logging: {
      level: 'silent',
    },
  },
})
