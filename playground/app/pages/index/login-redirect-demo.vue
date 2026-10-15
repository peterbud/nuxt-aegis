<script setup lang="ts">
const route = useRoute()
const { isLoggedIn, user, isLoading, login, logout } = useAuth()
const redirectSource = computed(() => typeof route.query.from === 'string' ? route.query.from : 'unknown')
const returnPath = '/redirects'
const isBusy = ref(false)
const error = ref('')

async function handleAction(action: 'login' | 'logout') {
  isBusy.value = true
  error.value = ''
  try {
    if (action === 'login') {
      await login('mock', '/login-redirect-demo?from=playground')
    }
    else {
      await logout(returnPath)
    }
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Authentication action failed'
  }
  finally {
    isBusy.value = false
  }
}
</script>

<template>
  <section aria-labelledby="redirect-heading">
    <header class="section-heading">
      <h2 id="redirect-heading">
        Custom Login Redirect Reached
      </h2>
    </header>
    <dl class="comparison">
      <div><dt>Redirect source</dt><dd>{{ redirectSource }}</dd></div>
      <div><dt>Authenticated</dt><dd>{{ isLoggedIn ? 'Yes' : 'No' }}</dd></div>
      <div><dt>Current user</dt><dd>{{ user?.email || 'Not available' }}</dd></div>
    </dl>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <div class="action-row">
      <a
        :href="returnPath"
        class="button button-primary"
      >Return to Playground</a>
      <button
        v-if="!isLoggedIn"
        type="button"
        class="button"
        :disabled="isBusy || isLoading"
        @click="handleAction('login')"
      >
        Retry Redirect Login
      </button>
      <button
        v-else
        type="button"
        class="button"
        :disabled="isBusy || isLoading"
        @click="handleAction('logout')"
      >
        Logout to Playground
      </button>
    </div>
  </section>
</template>
