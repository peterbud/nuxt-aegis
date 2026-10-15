<script setup lang="ts">
defineOptions({ name: 'AccessScenario' })

const { isLoggedIn, isLoading } = useAuth()
const { $api } = useNuxtApp()
const response = ref<unknown>(null)
const status = ref<number | null>(null)
const error = ref('')
const activeRequest = ref<'public' | 'anonymous' | 'protected' | null>(null)
const lastRequest = ref('')
const expectedDenial = ref(false)

async function runRequest(kind: 'public' | 'anonymous' | 'protected') {
  response.value = null
  error.value = ''
  status.value = null
  expectedDenial.value = false
  activeRequest.value = kind
  lastRequest.value = kind === 'public' ? '/api/public' : '/api/user/profile'
  try {
    if (kind === 'protected') {
      response.value = await $api('/api/user/profile')
      status.value = 200
    }
    else {
      const result = await $fetch.raw(lastRequest.value, { credentials: 'omit' })
      response.value = result._data
      status.value = result.status
    }
  }
  catch (cause) {
    const failure = cause as { statusCode?: number, status?: number, data?: unknown, message?: string }
    status.value = failure.statusCode || failure.status || null
    expectedDenial.value = kind === 'anonymous' && status.value === 401
    response.value = failure.data || null
    error.value = failure.message || 'Request failed'
  }
  finally {
    activeRequest.value = null
  }
}
</script>

<template>
  <section aria-labelledby="access-heading">
    <header class="section-heading">
      <h2 id="access-heading">
        Access checks
      </h2><span class="meta">Public & authenticated</span>
    </header>
    <h3>API endpoints</h3>
    <div class="test-list">
      <div class="test-row">
        <div><strong>Public request</strong><code>GET /api/public</code></div>
        <button
          type="button"
          class="button"
          :disabled="activeRequest !== null || isLoading"
          @click="runRequest('public')"
        >
          {{ activeRequest === 'public' ? 'Requesting...' : 'Run request' }}
        </button>
      </div>
      <div class="test-row">
        <div><strong>Protected request · no token</strong><code>GET /api/user/profile</code></div>
        <button
          type="button"
          class="button"
          :disabled="activeRequest !== null || isLoading"
          @click="runRequest('anonymous')"
        >
          {{ activeRequest === 'anonymous' ? 'Requesting...' : 'Run request' }}
        </button>
      </div>
      <div class="test-row">
        <div><strong>Protected request · bearer token</strong><code>GET /api/user/profile</code></div>
        <button
          type="button"
          class="button"
          :disabled="activeRequest !== null || !isLoggedIn || isLoading"
          @click="runRequest('protected')"
        >
          {{ activeRequest === 'protected' ? 'Requesting...' : 'Run request' }}
        </button>
      </div>
    </div>
    <p
      v-if="!isLoggedIn"
      class="meta"
    >
      Sign in to send an authenticated request.
    </p>
    <div
      v-if="status !== null || error"
      class="result-panel"
    >
      <div class="result-heading">
        <strong>{{ lastRequest }}</strong><span :class="expectedDenial || !error ? 'status' : 'feedback-error'">{{ status }}{{ expectedDenial ? ' · Expected denial' : '' }}</span>
      </div>
      <pre v-if="response">{{ JSON.stringify(response, null, 2) }}</pre>
      <p
        v-if="error"
        :class="['feedback', { 'feedback-error': !expectedDenial }]"
        :role="expectedDenial ? 'status' : 'alert'"
      >
        {{ error }}
      </p>
    </div>
    <div class="subsection">
      <h3>Page protection</h3>
      <div class="test-list">
        <div class="test-row">
          <div><strong>Public page</strong><small>Guest or authenticated session</small></div><NuxtLink
            to="/public-page"
            class="button"
          >Open page</NuxtLink>
        </div>
        <div class="test-row">
          <div><strong>Protected page</strong><small>Auth middleware & useAegisFetch</small></div><NuxtLink
            to="/protected-page"
            class="button"
          >Open page</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
