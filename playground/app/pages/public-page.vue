<script setup lang="ts">
import { useAuth } from '#imports'

const { isLoggedIn, user } = useAuth()
const publicData = ref<Record<string, unknown> | null>(null)
const error = ref<string | null>(null)

const fetchPublicData = async () => {
  publicData.value = null
  error.value = null

  try {
    const data = await $fetch('/api/public')
    publicData.value = data
  }
  catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to fetch public data'
  }
}

// Fetch data on mount
onMounted(() => {
  fetchPublicData()
})
</script>

<template>
  <div class="public-page">
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
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>Nuxt Aegis - Public Page</span>
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

    <!-- Main Content -->
    <div class="main-container">
      <div class="card">
        <div class="icon-wrapper">
          <div class="public-icon">
            🌐
          </div>
        </div>
        <h1>Public Page</h1>
        <p class="subtitle">
          This page is accessible to everyone, no authentication required!
        </p>

        <!-- Authentication Status -->
        <div class="status-section">
          <div
            v-if="isLoggedIn"
            class="status-card status-logged-in"
          >
            <div class="status-icon">
              ✓
            </div>
            <div class="status-content">
              <h3>You are logged in</h3>
              <p>Welcome back, <strong>{{ user?.name || user?.email }}</strong>!</p>
            </div>
          </div>
          <div
            v-else
            class="status-card status-guest"
          >
            <div class="status-icon">
              👤
            </div>
            <div class="status-content">
              <h3>You are browsing as a guest</h3>
              <p>You can access this page without logging in.</p>
            </div>
          </div>
        </div>

        <!-- Public API Data -->
        <div class="data-section">
          <h2>Public API Data</h2>
          <p class="section-description">
            This page automatically fetches data from <code>/api/public</code> endpoint.
          </p>

          <button
            class="btn btn-primary"
            @click="fetchPublicData"
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
            v-if="publicData"
            class="response-box"
          >
            <h4>API Response:</h4>
            <pre>{{ JSON.stringify(publicData, null, 2) }}</pre>
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
                🔓
              </div>
              <h3>No Authentication Required</h3>
              <p>This page can be accessed by anyone, whether logged in or not.</p>
            </div>
            <div class="info-card">
              <div class="info-icon">
                🌍
              </div>
              <h3>Public API Access</h3>
              <p>The <code>/api/public</code> endpoint is accessible without authentication.</p>
            </div>
            <div class="info-card">
              <div class="info-icon">
                👥
              </div>
              <h3>Guest-Friendly</h3>
              <p>Perfect for landing pages, documentation, or public content.</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <NuxtLink
            v-if="!isLoggedIn"
            to="/"
            class="btn btn-primary"
          >
            <span>🔐</span>
            Go to Login Page
          </NuxtLink>
          <NuxtLink
            v-else
            to="/"
            class="btn btn-success"
          >
            <span>✓</span>
            View Authenticated Features
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Theme */
.public-page {
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
  --color-info: #4299e1;

  /* Status colors */
  --status-success-bg: #c6f6d5;
  --status-success-text: #22543d;
  --status-info-bg: #bee3f8;
  --status-info-text: #2c5282;
  --status-error-bg: #fed7d7;
  --status-error-text: #742a2a;
}

@media (prefers-color-scheme: dark) {
  .public-page {
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
    --status-info-bg: #1e3a5f;
    --status-info-text: #93c5fd;
    --status-error-bg: #5a1a1a;
    --status-error-text: #fca5a5;
  }
}

* {
  box-sizing: border-box;
}

.public-page {
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
  color: var(--color-primary);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
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

.public-icon {
  font-size: 4rem;
  line-height: 1;
  background: var(--status-info-bg);
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.2);
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

.section-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Status Section */
.status-section {
  margin: 2rem 0;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 2px solid;
}

.status-logged-in {
  background: var(--status-success-bg);
  border-color: var(--color-success);
}

.status-guest {
  background: var(--status-info-bg);
  border-color: var(--color-info);
}

.status-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.status-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.status-content p {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-secondary);
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

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover {
  background: var(--color-success-dark);
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

/* Actions */
.actions {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
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
