<script setup lang="ts">
import { useAuth } from '#imports'

definePageMeta({
  middleware: 'auth-logged-in',
})

const { user, isImpersonating, originalUser } = useAuth()
const protectedData = ref<Record<string, unknown> | null>(null)
const error = ref<string | null>(null)

const fetchProtectedData = async () => {
  protectedData.value = null
  error.value = null

  try {
    const data = await useNuxtApp().$api('/api/user/profile')
    protectedData.value = data
  }
  catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to fetch protected data'
  }
}

// Fetch data on mount
onMounted(() => {
  fetchProtectedData()
})
</script>

<template>
  <div class="protected-page">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              ry="2"
            />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>Nuxt Aegis - Protected Page</span>
        </div>
        <div class="header-actions">
          <NuxtLink
            to="/"
            class="btn btn-secondary"
          >
            <span>🏠</span>
            Home
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Impersonation Banner -->
    <div
      v-if="isImpersonating && originalUser"
      class="impersonation-banner"
    >
      <div class="impersonation-content">
        <div class="impersonation-icon">
          ⚠️
        </div>
        <div class="impersonation-text">
          <p>
            <strong>Impersonation Mode:</strong> Viewing as <strong>{{ user?.name || user?.email }}</strong>
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-container">
      <div class="card">
        <div class="icon-wrapper">
          <div class="protected-icon">
            🔐
          </div>
        </div>
        <h1>Protected Page</h1>
        <p class="subtitle">
          This page is only accessible to authenticated users!
        </p>

        <!-- User Info -->
        <div class="user-section">
          <div class="user-card">
            <div class="user-avatar">
              {{ (user?.name || user?.email || 'U').charAt(0).toUpperCase() }}
            </div>
            <div class="user-info">
              <h3>Welcome, {{ user?.name || user?.email }}!</h3>
              <div class="user-details">
                <div
                  v-if="user?.email"
                  class="detail-item"
                >
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">{{ user.email }}</span>
                </div>
                <div
                  v-if="user?.role"
                  class="detail-item"
                >
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">
                    <span
                      class="role-badge"
                      :class="`role-${user.role}`"
                    >
                      {{ user.role }}
                    </span>
                  </span>
                </div>
                <div
                  v-if="user?.provider"
                  class="detail-item"
                >
                  <span class="detail-label">Provider:</span>
                  <span class="detail-value">{{ user.provider }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Protected API Data -->
        <div class="data-section">
          <h2>Protected API Data</h2>
          <p class="section-description">
            This page automatically fetches data from <code>/api/user/profile</code> endpoint which requires authentication.
          </p>

          <button
            class="btn btn-primary"
            @click="fetchProtectedData"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Refresh Data
          </button>

          <div
            v-if="protectedData"
            class="response-box"
          >
            <h4>API Response:</h4>
            <pre>{{ JSON.stringify(protectedData, null, 2) }}</pre>
          </div>

          <div
            v-if="error"
            class="alert alert-error"
          >
            <h4>Error:</h4>
            <pre>{{ error }}</pre>
          </div>
        </div>

        <!-- Information Section -->
        <div class="info-section">
          <h2>About This Page</h2>
          <div class="info-grid">
            <div class="info-card">
              <div class="info-icon">
                🔒
              </div>
              <h3>Authentication Required</h3>
              <p>This page uses the <code>auth</code> middleware to protect access. Unauthenticated users are redirected to the login page.</p>
            </div>
            <div class="info-card">
              <div class="info-icon">
                🛡️
              </div>
              <h3>Protected API Access</h3>
              <p>The <code>/api/user/**</code> endpoints require authentication and automatically include the bearer token.</p>
            </div>
            <div class="info-card">
              <div class="info-icon">
                ✓
              </div>
              <h3>Secure Routes</h3>
              <p>Perfect for dashboards, user profiles, or any authenticated-only content.</p>
            </div>
          </div>
        </div>

        <!-- Middleware Info -->
        <div class="middleware-info">
          <h3>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              style="display: inline-block; vertical-align: middle; margin-right: 0.5rem;"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Page Protection Details
          </h3>
          <div class="code-block">
            <pre><code>definePageMeta({
  middleware: 'auth',
})</code></pre>
          </div>
          <p class="hint">
            This page uses the built-in <code>auth</code> middleware from Nuxt Aegis to ensure only authenticated users can access it.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Theme */
.protected-page {
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

  /* Brand colors */
  --color-primary: #4299e1;
  --color-primary-dark: #2b6cb0;
  --color-success: #48bb78;
  --color-success-dark: #2f855a;
  --color-secondary: #718096;
  --color-warning: #ed8936;
  --color-danger: #f56565;

  /* Status colors */
  --status-success-bg: #c6f6d5;
  --status-success-text: #22543d;
  --status-error-bg: #fed7d7;
  --status-error-text: #742a2a;
  --status-warning-bg: #feebc8;
  --status-warning-text: #7c2d12;
}

@media (prefers-color-scheme: dark) {
  .protected-page {
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

    /* Adjusted status colors for dark mode */
    --status-success-bg: #1b4332;
    --status-success-text: #74c69d;
    --status-error-bg: #5a1a1a;
    --status-error-text: #fca5a5;
    --status-warning-bg: #5a2d0c;
    --status-warning-text: #fdba74;
  }
}

* {
  box-sizing: border-box;
}

.protected-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Header */
.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 2rem;
  box-shadow: var(--shadow);
}

.header-content {
  max-width: 1200px;
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
  color: var(--color-success);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* Impersonation Banner */
.impersonation-banner {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-bottom: 3px solid var(--color-warning);
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(237, 137, 54, 0.15);
}

.impersonation-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.impersonation-icon {
  font-size: 2rem;
  line-height: 1;
  background: var(--color-warning);
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(237, 137, 54, 0.2);
}

.impersonation-text p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.impersonation-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

/* Main Container */
.main-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Card */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 3rem 2rem;
  box-shadow: var(--shadow-lg);
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.protected-icon {
  font-size: 4rem;
  line-height: 1;
  background: var(--status-success-bg);
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.2);
}

h1 {
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  text-align: center;
  color: var(--text-primary);
  font-weight: 600;
}

.subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 1.125rem;
  margin: 0 0 2rem 0;
}

h2 {
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-weight: 600;
}

h3 {
  font-size: 1.125rem;
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  font-weight: 600;
}

.section-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* User Section */
.user-section {
  margin: 2rem 0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: var(--bg-tertiary);
  border: 2px solid var(--color-success);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(72, 187, 120, 0.1);
}

.user-avatar {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-success) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.user-info {
  flex: 1;
}

.user-info h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
}

.detail-label {
  color: var(--text-tertiary);
  font-weight: 500;
  min-width: 80px;
}

.detail-value {
  color: var(--text-primary);
  font-weight: 500;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-admin {
  background: var(--status-error-bg);
  color: var(--status-error-text);
}

.role-user {
  background: var(--status-success-bg);
  color: var(--status-success-text);
}

/* Data Section */
.data-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

/* Info Section */
.info-section {
  margin: 2rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.info-card {
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  text-align: center;
}

.info-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.info-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.info-card p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Middleware Info */
.middleware-info {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border: 2px solid var(--color-primary);
  border-radius: 0.5rem;
}

.middleware-info h3 {
  display: flex;
  align-items: center;
  margin: 0 0 1rem 0;
  color: var(--color-primary);
}

.code-block {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  margin-bottom: 0.75rem;
}

.code-block pre {
  margin: 0;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--text-primary);
  line-height: 1.6;
}

.code-block code {
  background: transparent;
  padding: 0;
  border: none;
  color: var(--color-primary);
}

.hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Response Box */
.response-box {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
}

.response-box h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.response-box pre {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

/* Alert */
.alert {
  padding: 0.875rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.alert-error {
  background: var(--status-error-bg);
  color: var(--status-error-text);
  border: 1px solid var(--color-danger);
}

.alert h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.alert pre {
  margin: 0;
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
}

code {
  background: var(--bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--color-primary);
  border: 1px solid var(--border-color);
}
</style>
