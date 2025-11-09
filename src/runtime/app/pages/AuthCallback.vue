<script setup lang="ts">
/**
 * Authentication Callback Page
 *
 * Handles the OAuth callback and authorization CODE exchange flow.
 *
 * Flow:
 * 1. CL-21: Parse authorization CODE from URL query parameter (?code=XXX)
 * 2. CL-22: Exchange CODE for JWT tokens via POST /auth/token
 * 3. CL-18, CL-23: Store access token in memory (reactive ref)
 * 4. EP-15: Receive access token from JSON response
 * 5. EP-16: Refresh token set as HttpOnly cookie by server
 * 6. Update authentication state and redirect to success URL
 *
 * Error Handling:
 * - CL-24: Handle error query parameter from provider
 * - EH-4: Display generic error messages to prevent information leakage
 * - All failures show "Authentication failed. Please try again."
 *
 * Requirements: CL-21, CL-22, CL-23, CL-24, EP-15, EP-16, EH-4
 */
import { navigateTo } from '#app'
import { ref, onMounted } from 'vue'
import { setAccessToken } from '../utils/tokenStore'

const processing = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    // CL-21: Parse authorization CODE from URL query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')

    // CL-24: Handle error from query params
    if (errorParam) {
      // EH-4: Display generic error message to user
      error.value = 'Authentication failed. Please try again.'
      console.error('[Nuxt Aegis] Authentication error:', errorParam)

      // Clear query params from URL
      window.history.replaceState(null, '', window.location.pathname)

      processing.value = false

      // TODO: Redirect to configurable error URL
      setTimeout(() => navigateTo('/'), 3000)
      return
    }

    if (!code) {
      // EH-4: Generic error message - don't reveal CODE is missing
      error.value = 'Authentication failed. Please try again.'
      console.error('[Nuxt Aegis] No authorization code in URL')
      processing.value = false
      setTimeout(() => navigateTo('/'), 3000)
      return
    }

    // CL-22: Exchange CODE for tokens via /auth/token endpoint
    // Use $fetch directly instead of $api to avoid triggering request interceptors
    const response = await $fetch<{ accessToken: string }>(
      '/auth/token',
      {
        method: 'POST',
        body: { code },
      },
    )

    if (!response?.accessToken) {
      // EH-4: Generic error message
      error.value = 'Authentication failed. Please try again.'
      console.error('[Nuxt Aegis] No access token in response')
      processing.value = false
      setTimeout(() => navigateTo('/'), 3000)
      return
    }

    // CL-18, CL-23: Store access token in memory (NOT sessionStorage)
    setAccessToken(response.accessToken)

    // Decode token and update auth state directly (no need to call refresh)
    // We already have a fresh access token from the exchange
    const tokenParts = response.accessToken.split('.')
    if (tokenParts[1]) {
      const payload = JSON.parse(atob(tokenParts[1]))
      // Update the auth state by accessing the useState directly
      const { useState } = await import('#app')
      const authState = useState('auth-state')
      authState.value = { user: payload, isLoading: false, error: null }
    }

    // Clear the code from URL to prevent reuse
    window.history.replaceState(
      {},
      '',
      window.location.pathname,
    )

    processing.value = false

    // Redirect to success URL or originally requested route
    // TODO: Use configurable success URL
    navigateTo('/')
  }
  catch (err) {
    // EH-4: Generic error message to prevent information leakage
    console.error('[Nuxt Aegis] Error processing callback:', err)
    error.value = 'Authentication failed. Please try again.'
    processing.value = false

    // Redirect after showing error
    setTimeout(() => navigateTo('/'), 3000)
  }
})
</script>

<template>
  <div class="auth-callback">
    <div v-if="error">
      <p>Authentication error: {{ error }}</p>
    </div>
    <div v-else-if="processing">
      <p>Processing authentication...</p>
    </div>
    <div v-else>
      <p>Authentication successful. Redirecting...</p>
    </div>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  text-align: center;
}
</style>
