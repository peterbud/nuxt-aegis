import MyModule from '../../../src/module'

export default defineNuxtConfig({
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
          },
        },
      },
    },
    logging: {
      level: 'silent',
    },
  },
})
