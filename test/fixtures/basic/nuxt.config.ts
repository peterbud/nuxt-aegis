import MyModule from '../../../src/module'
import { testViteConfig } from '../test.config'

export default defineNuxtConfig({
  ...testViteConfig,
  modules: [
    MyModule,
  ],
  nuxtAegis: {
    token: {
      secret: 'secret_token',
    },
    logging: {
      level: 'silent',
    },
  },
})
