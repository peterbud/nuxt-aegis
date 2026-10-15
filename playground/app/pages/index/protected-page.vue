<script setup lang="ts">
definePageMeta({ middleware: 'auth-logged-in' })

const { user, isLoggedIn } = useAuth()
const { data: protectedData, error, status, refresh: fetchProtectedData } = await useAegisFetch('/api/user/profile', {
  key: 'protected-page-profile',
  immediate: isLoggedIn.value,
  watch: false,
})

onMounted(() => {
  if (isLoggedIn.value && !protectedData.value && status.value !== 'pending') {
    void fetchProtectedData()
  }
})
</script>

<template>
  <section aria-labelledby="protected-heading">
    <header class="section-heading">
      <h2 id="protected-heading">
        Protected Page
      </h2><span class="requirement">Authentication required</span>
    </header>
    <div class="user-info feedback">
      Welcome, <strong>{{ user?.name || user?.email }}</strong>!
    </div>
    <dl class="comparison subsection">
      <div><dt>Email</dt><dd>{{ user?.email }}</dd></div>
      <div><dt>Role</dt><dd>{{ user?.role || 'None' }}</dd></div>
      <div><dt>Provider</dt><dd>{{ user?.provider }}</dd></div>
    </dl>
    <div class="test-list subsection">
      <div class="test-row">
        <div><strong>Protected API Data</strong><code>/api/user/profile</code></div>
        <button
          type="button"
          class="button"
          :disabled="status === 'pending'"
          @click="fetchProtectedData()"
        >
          {{ status === 'pending' ? 'Loading...' : 'Refresh Data' }}
        </button>
      </div>
    </div>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error.message }}
    </p>
    <div
      v-if="protectedData"
      class="result-panel response-box"
    >
      <div class="result-heading">
        API Response
      </div>
      <pre>{{ JSON.stringify(protectedData, null, 2) }}</pre>
    </div>
    <div class="action-row">
      <NuxtLink
        to="/access"
        class="button"
      >Access checks</NuxtLink>
      <NuxtLink
        to="/public-page"
        class="button"
      >Public Page</NuxtLink>
    </div>
  </section>
</template>
