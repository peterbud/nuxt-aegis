<script setup lang="ts">
import { useAuth as explicitAuth, useAegisFetch as explicitFetch } from '#nuxt-aegis/app'
import * as appApi from '#nuxt-aegis/app'

const { authStatus } = explicitAuth()
const appExports = Object.keys(appApi).sort().join(',')
const autoImportsMatch = explicitAuth === useAuth && explicitFetch === useAegisFetch
const api: typeof $fetch = useNuxtApp().$api
const explicitFirst = await explicitFetch('/api/imports')
const explicitSecond = await explicitFetch('/api/imports')
const autoFirst = await useAegisFetch('/api/imports')
const autoSecond = await useAegisFetch('/api/imports', { $fetch: api })
const distinct = new Set([
  explicitFirst.data.value?.requestId,
  explicitSecond.data.value?.requestId,
  autoFirst.data.value?.requestId,
  autoSecond.data.value?.requestId,
]).size === 4
</script>

<template>
  <div>
    basic index page
    <span id="auth-status">{{ authStatus }}</span>
    <span id="distinct">{{ distinct }}</span>
    <span id="app-exports">{{ appExports }}</span>
    <span id="app-auto-imports">{{ autoImportsMatch }}</span>
  </div>
</template>
