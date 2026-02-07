import MyModule from '../../../src/module'
import { testViteConfig } from '../test.config'

export default defineNuxtConfig({
  ...testViteConfig,
  modules: [
    MyModule,
  ],

  // Protect all /api/** routes via Nitro route rules (the module's intended mechanism)
  nitro: {
    routeRules: {
      '/api/**': { nuxtAegis: { auth: true } },
    },
  },

  nuxtAegis: {
    token: {
      secret: 'test_secret_key_for_jwt_signing_min_32_chars',
      expiresIn: '15m',
    },
    tokenRefresh: {
      enabled: true,
      cookie: {
        maxAge: 604800,
      },
    },
    providers: {
      mock: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        defaultUser: 'default',
        mockUsers: {
          default: {
            sub: 'mock-user-001',
            email: 'user@test.com',
            name: 'Test User',
          },
        },
      },
    },
    logging: {
      level: 'silent',
    },
  },
})
