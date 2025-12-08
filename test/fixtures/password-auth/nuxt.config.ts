import { testViteConfig } from '../test.config'

export default defineNuxtConfig({
  ...testViteConfig,
  modules: ['../../../src/module.ts'],
  nuxtAegis: {
    token: {
      secret: 'test-secret-key-minimum-32-bytes-long',
    },
    providers: {
      password: {
        magicCodeTTL: 600,
        passwordPolicy: {
          minLength: 8,
        },
      },
    },
    logging: {
      level: 'silent',
    },
  },
})
