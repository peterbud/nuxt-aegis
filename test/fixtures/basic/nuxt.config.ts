import MyModule from '../../../src/module'
import { testViteConfig } from '../test.config'
import type { OAuthTransactionConfig } from '#nuxt-aegis/types'

const oauthTransaction = { driver: 'memory' } satisfies OAuthTransactionConfig

export default defineNuxtConfig({
  ...testViteConfig,
  modules: [
    MyModule,
  ],
  nuxtAegis: {
    oauthTransaction,
    token: {
      secret: 'secret_token',
    },
    logging: {
      level: 'silent',
    },
  },
})
