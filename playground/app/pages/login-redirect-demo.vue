<script setup lang="ts">
const route = useRoute()
const { isLoggedIn, user, login, logout } = useAuth()

const redirectSource = computed(() => route.query.from as string || 'unknown')

const retryRedirectDemo = async () => {
  await login('mock', '/login-redirect-demo?from=playground')
}

const handleLogout = async () => {
  await logout('/')
}
</script>

<template>
  <div class="auth-playground">
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Auth Playground</span>
        </div>
        <div class="header-status">
          <span
            class="status-badge status-info"
          >
            Redirect Demo
          </span>
          <span
            v-if="isLoggedIn"
            class="status-badge status-logged-in"
          >
            Logged In: {{ user?.email }}
          </span>
          <button
            v-if="isLoggedIn"
            class="btn-logout"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <div class="main-container demo-layout">
      <div class="column">
        <div class="card">
          <h1 class="card-title page-title">
            Custom Login Redirect Reached
          </h1>
          <p class="section-description intro-copy">
            This page uses the same playground shell and confirms that <code>useAuth().login()</code> honored the custom <code>redirectTo</code> path after the OAuth callback completed.
          </p>

          <div class="details-panel">
            <div class="detail-row">
              <span class="detail-label">Redirect source</span>
              <span class="detail-value">{{ redirectSource }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Authenticated</span>
              <span class="detail-value">{{ isLoggedIn ? 'Yes' : 'No' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Current user</span>
              <span class="detail-value">{{ user?.email || 'Not available' }}</span>
            </div>
          </div>

          <div class="btn-group actions-row">
            <NuxtLink
              to="/"
              class="btn btn-primary"
            >
              Return to Playground
            </NuxtLink>
            <button
              v-if="!isLoggedIn"
              class="btn btn-success"
              @click="retryRedirectDemo"
            >
              Retry Redirect Login
            </button>
            <button
              v-else
              class="btn btn-secondary"
              @click="handleLogout"
            >
              Logout to Home
            </button>
          </div>
        </div>
      </div>

      <div class="column">
        <div class="card section-demo">
          <h2 class="section-title">
            What This Demonstrates
          </h2>
          <p class="section-description">
            The home page triggers <code>login('mock', '/login-redirect-demo?from=playground')</code>. Nuxt Aegis transports that value through the auth flow and uses it after the token exchange instead of the default success redirect.
          </p>
          <div class="flow-list">
            <div class="flow-item">
              <span class="flow-step">1</span>
              <div>
                <strong>Start from the playground home</strong>
                <p>Use the Redirect Demo button in the Mock Provider section.</p>
              </div>
            </div>
            <div class="flow-item">
              <span class="flow-step">2</span>
              <div>
                <strong>Complete the mock login</strong>
                <p>The module preserves your requested destination through the callback flow.</p>
              </div>
            </div>
            <div class="flow-item">
              <span class="flow-step">3</span>
              <div>
                <strong>Land on this page</strong>
                <p>This confirms the explicit redirect overrode the default post-login path.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card section-demo">
          <h2 class="section-title">
            Verification Notes
          </h2>
          <p class="section-description">
            If you arrived here after logging in, the feature is working. If you navigate here directly while logged out, use the retry button above to start the same redirected flow from this page.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-playground {
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f8f9fc;
  --text-primary: #1a202c;
  --text-secondary: #4a5568;
  --text-tertiary: #718096;
  --border-color: #e2e8f0;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --color-primary: #4299e1;
  --color-primary-dark: #2b6cb0;
  --color-success: #48bb78;
  --color-success-dark: #2f855a;
  --color-warning: #ed8936;
  --color-warning-dark: #c05621;
  --color-danger: #f56565;
  --color-danger-dark: #c53030;
  --color-secondary: #718096;
  --color-info: #4299e1;
  --status-success-bg: #c6f6d5;
  --status-success-text: #22543d;
  --status-info-bg: #bee3f8;
  --status-info-text: #2c5282;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

@media (prefers-color-scheme: dark) {
  .auth-playground {
    --bg-primary: #0f1419;
    --bg-secondary: #1c2128;
    --bg-tertiary: #22272e;
    --text-primary: #e6edf3;
    --text-secondary: #adbac7;
    --text-tertiary: #768390;
    --border-color: #373e47;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
    --status-success-bg: #1b4332;
    --status-success-text: #74c69d;
    --status-info-bg: #1e3a5f;
    --status-info-text: #93c5fd;
  }
}

* {
  box-sizing: border-box;
}

.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 2rem;
  box-shadow: var(--shadow);
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.logo svg {
  color: var(--color-primary);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-info {
  background: var(--status-info-bg);
  color: var(--status-info-text);
}

.status-logged-in {
  background: var(--status-success-bg);
  color: var(--status-success-text);
}

.btn-logout {
  background: var(--color-danger);
  color: white;
  border: 1px solid var(--border-color);
  padding: 0.625rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: var(--color-danger-dark);
}

.main-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1200px) {
  .main-container {
    grid-template-columns: 1fr;
  }
}

.column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
}

.card-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.page-title {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.section-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.section-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.intro-copy {
  margin-bottom: 1.5rem;
}

.details-panel {
  padding: 1rem 1.25rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
}

.detail-row + .detail-row {
  border-top: 1px solid var(--border-color);
}

.detail-label {
  color: var(--text-secondary);
  font-weight: 600;
}

.detail-value {
  font-weight: 600;
  text-align: right;
}

.btn-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.actions-row {
  margin-top: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover {
  background: var(--color-success-dark);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

.section-demo {
  background: var(--bg-secondary);
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.flow-item {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
}

.flow-item p {
  margin: 0.25rem 0 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.flow-step {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--status-info-bg);
  color: var(--status-info-text);
  font-weight: 700;
  flex-shrink: 0;
}

code {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  font-size: 0.875em;
}

@media (max-width: 640px) {
  .header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .main-container {
    padding: 1rem;
  }

  .detail-row {
    flex-direction: column;
  }

  .detail-value {
    text-align: left;
  }

  .btn-group {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
