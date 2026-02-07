<script setup lang="ts">
/**
 * Minimal page demonstrating the full nuxt-aegis client-side flow.
 *
 * - useAuth() composable for reactive auth state and login/logout
 * - useNuxtApp().$api() for authenticated API calls (auto-attaches Bearer token)
 */
import { useAuth, useNuxtApp } from '#imports'
import { ref } from 'vue'

const { isLoggedIn, user, login, logout } = useAuth()

const apiResponse = ref<Record<string, unknown> | null>(null)
const apiError = ref<string | null>(null)

const handleLogin = () => login('mock')

const handleLogout = async () => {
  apiResponse.value = null
  apiError.value = null
  await logout()
}

const callProtectedApi = async () => {
  apiResponse.value = null
  apiError.value = null
  try {
    // $api auto-attaches the Bearer token from the in-memory store
    const data = await useNuxtApp().$api('/api/profile')
    apiResponse.value = data as Record<string, unknown>
  }
  catch (err: unknown) {
    apiError.value = (err as Error).message || 'Request failed'
  }
}
</script>

<template>
  <div>
    <h1 data-testid="title">
      Minimal E2E
    </h1>

    <div data-testid="auth-status">
      {{ isLoggedIn ? 'authenticated' : 'unauthenticated' }}
    </div>

    <div
      v-if="isLoggedIn"
      data-testid="user-info"
    >
      <span data-testid="user-email">{{ user?.email }}</span>
      <span data-testid="user-name">{{ user?.name }}</span>
    </div>

    <button
      v-if="!isLoggedIn"
      data-testid="login-btn"
      @click="handleLogin"
    >
      Login with Mock
    </button>

    <button
      v-if="isLoggedIn"
      data-testid="logout-btn"
      @click="handleLogout"
    >
      Logout
    </button>

    <button
      v-if="isLoggedIn"
      data-testid="api-btn"
      @click="callProtectedApi"
    >
      Call Protected API
    </button>

    <pre
      v-if="apiResponse"
      data-testid="api-response"
    >
      {{ JSON.stringify(apiResponse, null, 2) }}
    </pre>
    <div
      v-if="apiError"
      data-testid="api-error"
    >
      {{ apiError }}
    </div>
  </div>
</template>
