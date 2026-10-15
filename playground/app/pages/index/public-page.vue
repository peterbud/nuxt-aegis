<script setup lang="ts">
const { isLoggedIn, user } = useAuth()
const publicData = ref<Record<string, unknown> | null>(null)
const error = ref('')
const isLoading = ref(true)

async function fetchPublicData() {
  isLoading.value = true
  publicData.value = null
  error.value = ''
  try {
    publicData.value = await $fetch('/api/public')
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to fetch public data'
  }
  finally {
    isLoading.value = false
  }
}
onMounted(fetchPublicData)
</script>

<template>
  <section aria-labelledby="public-heading">
    <header class="section-heading">
      <h2 id="public-heading">
        Public Page
      </h2><span class="meta">Public access</span>
    </header>
    <p class="feedback">
      {{ isLoggedIn ? `Welcome back, ${user?.name || user?.email}!` : 'You are browsing as a guest.' }}
    </p>
    <div class="test-list subsection">
      <div class="test-row">
        <div><strong>Public API Data</strong><code>/api/public</code></div>
        <button
          type="button"
          class="button"
          :disabled="isLoading"
          @click="fetchPublicData"
        >
          {{ isLoading ? 'Loading...' : 'Refresh Data' }}
        </button>
      </div>
    </div>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <div
      v-if="publicData"
      class="result-panel"
    >
      <div class="result-heading">
        API Response
      </div>
      <pre>{{ JSON.stringify(publicData, null, 2) }}</pre>
    </div>
    <div class="action-row">
      <NuxtLink
        v-if="!isLoggedIn"
        to="/sign-in"
        class="button button-primary"
      >Go to Login Page</NuxtLink>
      <NuxtLink
        to="/access"
        class="button"
      >Access checks</NuxtLink>
      <NuxtLink
        to="/protected-page"
        class="button"
      >Protected Page</NuxtLink>
    </div>
  </section>
</template>
