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
      google: {
        clientId: 'mock-google-client-id',
        clientSecret: 'mock-google-client-secret',
        scopes: ['openid', 'profile', 'email'],
      },
    },
  },
})
