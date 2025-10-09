<script setup lang="ts">
import { navigateTo } from '#app'
import { ref, onMounted } from 'vue'
import { useAuth } from '#imports'

const processing = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    // Parse access token from URL hash fragment (EP-13)
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const errorParam = params.get('error')

    // Handle error from hash (EP-15)
    if (errorParam) {
      error.value = errorParam
      console.error('[Nuxt Aegis] Authentication error:', errorParam)

      // Clear hash from URL (EP-16)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)

      processing.value = false

      // TODO: Redirect to configurable error URL
      navigateTo('/')
    }

    if (!accessToken) {
      error.value = 'No access token received'
      console.error('[Nuxt Aegis] No access token in URL hash')
      processing.value = false
      return
    }

    // Store token in sessionStorage (EP-13)
    await sessionStorage.setItem('nuxt.aegis.token', accessToken)

    // Clear the access token from URL hash to prevent exposure in browser history (EP-16)
    window.history.replaceState(
      {},
      '',
      window.location.pathname + window.location.search,
    )

    // Update authentication state
    await useAuth().refresh()

    processing.value = false

    // Redirect to success URL or originally requested route (EP-14)
    // TODO: Use configurable success URL
    navigateTo('/')
  }
  catch (err) {
    console.error('[Nuxt Aegis] Error processing callback:', err)
    error.value = 'Failed to process authentication'
    processing.value = false
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
