<script setup lang="ts">
const route = useRoute()

// Parse error information from query params
const errorCode = computed(() => route.query.error as string || 'unknown_error')
const errorDescription = computed(() => route.query.error_description as string || 'An authentication error occurred. Please try again.')

// Map error codes to user-friendly messages
const errorMessages: Record<string, { title: string, description: string }> = {
  authentication_failed: {
    title: 'Authentication Failed',
    description: 'We could not verify your identity. Please try logging in again.',
  },
  invalid_request: {
    title: 'Invalid Request',
    description: 'The authentication request was invalid. Please try again.',
  },
  token_exchange_failed: {
    title: 'Token Exchange Failed',
    description: 'We could not complete the authentication process. Please try again.',
  },
  processing_error: {
    title: 'Processing Error',
    description: 'An error occurred while processing your authentication. Please try again.',
  },
  token_refresh_failed: {
    title: 'Session Expired',
    description: 'Your session has expired. Please log in again.',
  },
  access_denied: {
    title: 'Access Denied',
    description: 'You denied the authorization request or do not have permission to access this resource.',
  },
  unknown_error: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred. Please try again.',
  },
}

const displayError = computed(() => {
  return errorMessages[errorCode.value] || errorMessages['unknown_error']
})
</script>

<template>
  <div class="auth-failed-page">
    <div class="container">
      <div class="card error-card">
        <div class="icon-wrapper">
          <div class="error-icon">
            ❌
          </div>
        </div>
        <h1>{{ displayError.title }}</h1>
        <p class="error-message">
          {{ displayError.description }}
        </p>

        <div class="error-details">
          <details>
            <summary>Technical Details</summary>
            <div class="details-content">
              <div class="detail-item">
                <strong>Error Code:</strong>
                <code>{{ errorCode }}</code>
              </div>
              <div class="detail-item">
                <strong>Description:</strong>
                <code>{{ errorDescription }}</code>
              </div>
            </div>
          </details>
        </div>

        <div class="actions">
          <NuxtLink
            to="/"
            class="button button-primary"
          >
            <span>🏠</span>
            Return to Home
          </NuxtLink>
          <button
            class="button button-secondary"
            @click="$router.go(-1)"
          >
            <span>←</span>
            Go Back
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Theme */
.auth-failed-page {
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
  --color-danger: #f56565;
  --color-danger-dark: #c53030;
  --color-secondary: #718096;

  /* Status colors */
  --status-error-bg: #fed7d7;
  --status-error-text: #742a2a;
}

@media (prefers-color-scheme: dark) {
  .auth-failed-page {
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
    --status-error-bg: #5a1a1a;
    --status-error-text: #fca5a5;
  }
}

* {
  box-sizing: border-box;
}

.auth-failed-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 600px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.error-card {
  border: 2px solid var(--color-danger);
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.error-icon {
  font-size: 4rem;
  line-height: 1;
  background: var(--status-error-bg);
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(245, 101, 101, 0.2);
}

h1 {
  font-size: 2rem;
  margin: 0 0 1rem 0;
  color: var(--color-danger);
  font-weight: 600;
}

.error-message {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  font-size: 1.125rem;
  line-height: 1.6;
}

.error-details {
  margin: 2rem 0;
  text-align: left;
}

details {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
}

summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  user-select: none;
  transition: color 0.2s;
}

summary:hover {
  color: var(--text-primary);
}

.details-content {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.detail-item {
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item strong {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

code {
  background: var(--bg-secondary);
  padding: 0.375rem 0.625rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--color-danger);
  word-break: break-word;
  display: block;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.9375rem;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button-primary {
  background: var(--color-primary);
  color: white;
}

.button-primary:hover {
  background: var(--color-primary-dark);
}

.button-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.button-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
</style>
