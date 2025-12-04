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
  <div class="container">
    <div class="card error-card">
      <div class="error-icon">
        ❌
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
          Return to Home
        </NuxtLink>
        <button
          class="button button-secondary"
          @click="$router.go(-1)"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  background: #fef2f2;
}

.card {
  background: white;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.error-card {
  border: 2px solid #ef4444;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #dc2626;
}

.error-message {
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 1.125rem;
}

.error-details {
  margin: 2rem 0;
  text-align: left;
}

details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
}

summary {
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  user-select: none;
}

summary:hover {
  color: #374151;
}

.details-content {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.detail-item {
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item strong {
  color: #6b7280;
  font-size: 0.875rem;
}

code {
  background: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
  font-family: monospace;
  font-size: 0.875rem;
  color: #dc2626;
  word-break: break-word;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.button-primary {
  background: #3b82f6;
  color: white;
}

.button-primary:hover {
  background: #2563eb;
}

.button-secondary {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.button-secondary:hover {
  background: #f9fafb;
  color: #374151;
}
</style>
