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
import { navigateTo, useRuntimeConfig } from '#app'
import { ref, onMounted } from 'vue'
import { setAccessToken } from '../utils/tokenStore'
import { createLogger } from '../utils/logger'
import { validateRedirectPath } from '../utils/redirectValidation'

const logger = createLogger('Callback')
const config = useRuntimeConfig()
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
      logger.error('Authentication error:', errorParam)

      // Clear query params from URL
      window.history.replaceState(null, '', window.location.pathname)

      processing.value = false

      // Redirect to configured error URL with error query params
      const errorUrl = validateRedirectPath(config.public.nuxtAegis.redirect?.error || '/')
      const errorDescription = urlParams.get('error_description') || 'Authentication failed'
      await navigateTo(`${errorUrl}?error=${encodeURIComponent(errorParam)}&error_description=${encodeURIComponent(errorDescription)}`)
      return
    }

    if (!code) {
      // EH-4: Generic error message - don't reveal CODE is missing
      error.value = 'Authentication failed. Please try again.'
      logger.error('No authorization code in URL')
      processing.value = false

      // Redirect to configured error URL with error query params
      const errorUrl = validateRedirectPath(config.public.nuxtAegis.redirect?.error || '/')
      await navigateTo(`${errorUrl}?error=invalid_request&error_description=${encodeURIComponent('Authentication failed. Please try again.')}`)
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
      logger.error('No access token in response')
      processing.value = false

      // Redirect to configured error URL with error query params
      const errorUrl = validateRedirectPath(config.public.nuxtAegis.redirect?.error || '/')
      await navigateTo(`${errorUrl}?error=token_exchange_failed&error_description=${encodeURIComponent('Authentication failed. Please try again.')}`)
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

    // Redirect to configured success URL
    const successUrl = validateRedirectPath(config.public.nuxtAegis.redirect?.success || '/')
    await navigateTo(successUrl)
  }
  catch (err) {
    // EH-4: Generic error message to prevent information leakage
    logger.error('Error processing callback:', err)
    error.value = 'Authentication failed. Please try again.'
    processing.value = false

    // Redirect to configured error URL with error query params
    const errorUrl = validateRedirectPath(config.public.nuxtAegis.redirect?.error || '/')
    await navigateTo(`${errorUrl}?error=processing_error&error_description=${encodeURIComponent('Authentication failed. Please try again.')}`)
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
