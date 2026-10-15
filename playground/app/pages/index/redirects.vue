<script setup lang="ts">
defineOptions({ name: 'RedirectsScenario' })

const { isLoggedIn, isLoading, login, logout } = useAuth()
const isBusy = ref(false)
const navigationError = ref('')

async function startRedirect(action: 'login' | 'logout') {
  isBusy.value = true
  navigationError.value = ''
  try {
    if (action === 'login') {
      await login('mock', '/login-redirect-demo?from=playground')
    }
    else {
      await logout()
    }
  }
  catch (cause) {
    navigationError.value = cause instanceof Error ? cause.message : 'Redirect failed'
  }
  finally {
    isBusy.value = false
  }
}
</script>

<template>
  <section aria-labelledby="redirects-heading">
    <header class="section-heading">
      <h2 id="redirects-heading">
        Redirects
      </h2><span class="meta">Navigation</span>
    </header>
    <div class="test-list">
      <div class="test-row">
        <div><strong>Custom login destination</strong><code>/login-redirect-demo?from=playground</code></div><button
          type="button"
          class="button"
          :disabled="isBusy || isLoading || isLoggedIn"
          @click="startRedirect('login')"
        >
          Start login
        </button>
      </div>
      <div class="test-row">
        <div><strong>Logout destination</strong><code>/logout-success</code></div><button
          type="button"
          class="button"
          :disabled="isBusy || isLoading || !isLoggedIn"
          @click="startRedirect('logout')"
        >
          Sign out to demo
        </button>
      </div>
      <div class="test-row">
        <div><strong>Authentication failure</strong><code>/auth-failed</code></div><NuxtLink
          to="/auth-failed?error=access_denied"
          class="button"
        >Open page</NuxtLink>
      </div>
    </div>
    <p
      v-if="navigationError"
      class="feedback feedback-error"
      role="alert"
    >
      {{ navigationError }}
    </p>
  </section>
</template>
