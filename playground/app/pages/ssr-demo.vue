<template>
  <div class="ssr-demo">
    <h1>SSR Demo - Authentication State</h1>

    <section class="status-section">
      <h2>Current Status</h2>
      <div class="status-cards">
        <div class="status-card">
          <h3>Loading State</h3>
          <p
            class="status-value"
            :class="{ active: isLoading }"
          >
            {{ isLoading ? 'Loading...' : 'Ready' }}
          </p>
        </div>

        <div class="status-card">
          <h3>Authentication</h3>
          <p
            class="status-value"
            :class="{ active: !!user }"
          >
            {{ user ? 'Authenticated' : 'Not authenticated' }}
          </p>
        </div>

        <div class="status-card">
          <h3>SSR Rendered</h3>
          <p
            class="status-value"
            :class="{ active: isSSR }"
          >
            {{ isSSR ? 'Yes (server)' : 'No (client)' }}
          </p>
        </div>
      </div>
    </section>

    <section
      v-if="isLoading"
      class="loading-section"
    >
      <div class="loading-spinner" />
      <p>Restoring authentication state after SSR hydration...</p>
      <p class="loading-note">
        This takes ~200-500ms while the refresh endpoint exchanges the httpOnly cookie for an access token.
      </p>
    </section>

    <section
      v-else-if="user"
      class="authenticated-section"
    >
      <h2>User Information</h2>
      <div class="user-info">
        <p><strong>Name:</strong> {{ user.name || 'N/A' }}</p>
        <p><strong>Email:</strong> {{ user.email || 'N/A' }}</p>
        <p><strong>Subject (ID):</strong> {{ user.sub }}</p>
        <p><strong>Provider:</strong> {{ user.provider || 'N/A' }}</p>
      </div>

      <h2>Authenticated API Call Example</h2>
      <div class="api-example">
        <button
          :disabled="apiLoading"
          class="api-button"
          @click="fetchUserData"
        >
          {{ apiLoading ? 'Loading...' : 'Fetch User Data' }}
        </button>

        <div
          v-if="apiData"
          class="api-result success"
        >
          <h3>✓ API Response</h3>
          <pre>{{ JSON.stringify(apiData, null, 2) }}</pre>
        </div>

        <div
          v-if="apiError"
          class="api-result error"
        >
          <h3>✗ API Error</h3>
          <pre>{{ apiError }}</pre>
        </div>
      </div>

      <div class="actions">
        <button
          class="logout-button"
          @click="logout"
        >
          Log Out
        </button>
      </div>
    </section>

    <section
      v-else
      class="unauthenticated-section"
    >
      <h2>Not Authenticated</h2>
      <p>You are not currently logged in. Log in to see authentication state after SSR.</p>

      <div class="login-options">
        <button
          class="login-button google"
          @click="login('google')"
        >
          Log in with Google
        </button>
        <button
          class="login-button github"
          @click="login('github')"
        >
          Log in with GitHub
        </button>
        <button
          class="login-button mock"
          @click="login('mock')"
        >
          Log in with Mock Provider
        </button>
      </div>
    </section>

    <section class="explanation">
      <h2>How SSR Works in Nuxt Aegis</h2>

      <div class="flow-steps">
        <div class="step">
          <div class="step-number">
            1
          </div>
          <div class="step-content">
            <h3>Server-Side Rendering</h3>
            <p>Server renders this page without authentication tokens. No tokens in HTML (secure!).</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">
            2
          </div>
          <div class="step-content">
            <h3>Client Hydration</h3>
            <p>Browser receives HTML and Vue hydrates. Plugin starts running.</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">
            3
          </div>
          <div class="step-content">
            <h3>Token Refresh</h3>
            <p>Plugin calls /auth/refresh with httpOnly cookie, gets access token in memory.</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">
            4
          </div>
          <div class="step-content">
            <h3>State Ready</h3>
            <p>Authentication state becomes reactive. All $api calls now include bearer token.</p>
          </div>
        </div>
      </div>

      <div class="security-note">
        <h3>🔒 Security Benefits</h3>
        <ul>
          <li>No access tokens in HTML payload (prevents XSS exposure)</li>
          <li>Refresh tokens stay in httpOnly cookies (JavaScript can't access them)</li>
          <li>Access tokens only in memory (cleared on page refresh)</li>
          <li>Server routes use event.context.user, not bearer tokens</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { user, isLoading, login, logout } = useAuth()
const { $api } = useNuxtApp()

// Detect if this is SSR or client-side rendering
const isSSR = ref(true)
onMounted(() => {
  isSSR.value = false
})

// API call example
const apiLoading = ref(false)
const apiData = ref<Record<string, unknown> | null>(null)
const apiError = ref<string | null>(null)

async function fetchUserData() {
  apiLoading.value = true
  apiData.value = null
  apiError.value = null

  try {
    // This call will include the bearer token automatically
    const data = await $api('/api/user/me')
    apiData.value = data
  }
  catch (error: unknown) {
    const err = error as { message?: string }
    apiError.value = err.message || 'Failed to fetch data'
  }
  finally {
    apiLoading.value = false
  }
}
</script>

<style scoped>
.ssr-demo {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  color: #2c3e50;
  border-bottom: 3px solid #42b883;
  padding-bottom: 0.5rem;
  margin-bottom: 2rem;
}

h2 {
  color: #2c3e50;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

section {
  margin-bottom: 3rem;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.status-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  border: 2px solid #e9ecef;
}

.status-card h3 {
  margin: 0 0 0.5rem 0;
  color: #6c757d;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #6c757d;
  margin: 0;
}

.status-value.active {
  color: #42b883;
}

.loading-section {
  text-align: center;
  padding: 3rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid #e9ecef;
  border-top-color: #42b883;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-note {
  color: #6c757d;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.user-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
}

.user-info p {
  margin: 0.5rem 0;
}

.api-example {
  margin: 1rem 0;
}

.api-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.api-button:hover:not(:disabled) {
  background: #379c6f;
}

.api-button:disabled {
  background: #95d5b8;
  cursor: not-allowed;
}

.api-result {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid;
}

.api-result.success {
  background: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.api-result.error {
  background: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.api-result pre {
  margin: 0.5rem 0 0 0;
  overflow-x: auto;
  font-size: 0.85rem;
}

.login-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 300px;
  margin: 2rem 0;
}

.login-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
  color: white;
}

.login-button:hover {
  opacity: 0.9;
}

.login-button.google {
  background: #4285f4;
}

.login-button.github {
  background: #24292e;
}

.login-button.mock {
  background: #6c757d;
}

.logout-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.logout-button:hover {
  background: #c82333;
}

.actions {
  margin-top: 2rem;
}

.flow-steps {
  display: grid;
  gap: 1.5rem;
  margin: 2rem 0;
}

.step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.step-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: #42b883;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.step-content p {
  margin: 0;
  color: #6c757d;
}

.security-note {
  background: #d1ecf1;
  border: 2px solid #bee5eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.security-note h3 {
  margin-top: 0;
  color: #0c5460;
}

.security-note ul {
  margin: 1rem 0 0 0;
  padding-left: 1.5rem;
  color: #0c5460;
}

.security-note li {
  margin: 0.5rem 0;
}
</style>
