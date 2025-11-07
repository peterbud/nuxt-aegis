import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  nuxtAegis: {
    token: {
      secret: 'secret_token',
    },
  },
})
