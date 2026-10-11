import { useNuxtApp } from '#app'
import { createUseFetch } from '#app/composables/fetch'

export const useAegisFetch = createUseFetch(() => ({
  $fetch: useNuxtApp().$api,
}))
