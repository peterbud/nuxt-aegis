<script setup lang="ts">
const route = useRoute()
const errorCode = computed(() => typeof route.query.error === 'string' ? route.query.error : 'unknown_error')
const errorDescription = computed(() => typeof route.query.error_description === 'string' ? route.query.error_description : 'An authentication error occurred. Please try again.')

const errorMessages = {
  authentication_failed: { title: 'Authentication Failed', description: 'We could not verify your identity. Please try logging in again.' },
  invalid_request: { title: 'Invalid Request', description: 'The authentication request was invalid. Please try again.' },
  token_exchange_failed: { title: 'Token Exchange Failed', description: 'We could not complete the authentication process. Please try again.' },
  processing_error: { title: 'Processing Error', description: 'An error occurred while processing your authentication. Please try again.' },
  token_refresh_failed: { title: 'Session Expired', description: 'Your session has expired. Please log in again.' },
  access_denied: { title: 'Access Denied', description: 'You denied the authorization request or do not have permission to access this resource.' },
  unknown_error: { title: 'Authentication Error', description: 'An unexpected error occurred. Please try again.' },
}
const displayError = computed(() => errorMessages[errorCode.value as keyof typeof errorMessages] || errorMessages.unknown_error)
</script>

<template>
  <section aria-labelledby="error-heading">
    <header class="section-heading">
      <h2 id="error-heading">
        {{ displayError.title }}
      </h2><span class="meta">Authentication</span>
    </header>
    <p
      class="feedback feedback-error"
      role="alert"
    >
      {{ displayError.description }}
    </p>
    <details class="disclosure">
      <summary>Technical Details</summary>
      <dl class="comparison">
        <div><dt>Error Code</dt><dd><code>{{ errorCode }}</code></dd></div>
        <div><dt>Description</dt><dd>{{ errorDescription }}</dd></div>
      </dl>
    </details>
    <div class="action-row">
      <NuxtLink
        to="/sign-in"
        class="button button-primary"
      >Try again</NuxtLink>
      <NuxtLink
        to="/"
        class="button"
      >Return to Home</NuxtLink>
      <button
        type="button"
        class="button"
        @click="$router.go(-1)"
      >
        Go Back
      </button>
    </div>
  </section>
</template>
