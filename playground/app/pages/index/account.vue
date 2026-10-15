<script setup lang="ts">
defineOptions({ name: 'AccountScenario' })
definePageMeta({ alias: ['/reset-password'] })

const route = useRoute()
const { user, isLoggedIn, isLoading } = useAuth()
const { $api } = useNuxtApp()
const email = ref('')
const code = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const resetSession = ref('')
const pendingVerification = ref(false)
const isBusy = ref(false)
const error = ref('')
const success = ref(route.query.reset === 'success' ? 'Password reset successful. You can now sign in.' : '')

watch(() => route.query.session, (session) => {
  resetSession.value = typeof session === 'string' ? session : ''
}, { immediate: true })

async function runAction(action: 'request' | 'verify' | 'complete' | 'change') {
  error.value = ''
  success.value = ''
  if ((action === 'complete' || action === 'change') && newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  isBusy.value = true
  try {
    if (action === 'request') {
      await $fetch('/auth/password/reset-request', { method: 'POST', body: { email: email.value } })
      pendingVerification.value = true
      success.value = 'If an account exists, a verification code has been sent. Check the development server console or your email.'
    }
    else if (action === 'verify') {
      const response = await fetch(`/auth/password/reset-verify?${new URLSearchParams({ code: code.value })}`)
      if (!response.ok) {
        const failure = await response.json() as { message?: string }
        throw new Error(failure.message || 'Verification failed')
      }
      const destination = new URL(response.url)
      if (destination.pathname !== '/reset-password') {
        throw new Error('Unexpected reset destination')
      }
      await navigateTo(`${destination.pathname}${destination.search}`, { external: true })
    }
    else if (action === 'complete') {
      await $fetch('/auth/password/reset-complete', { method: 'POST', body: { sessionId: resetSession.value, password: newPassword.value } })
      newPassword.value = ''
      confirmPassword.value = ''
      code.value = ''
      pendingVerification.value = false
      await navigateTo('/account?reset=success', { replace: true })
      resetSession.value = ''
      success.value = 'Password reset successful. You can now sign in.'
    }
    else {
      await $api('/auth/password/change', { method: 'POST', body: { currentPassword: currentPassword.value, newPassword: newPassword.value } })
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      success.value = 'Password changed successfully.'
    }
  }
  catch (cause) {
    const failure = cause as { data?: { message?: string }, message?: string }
    error.value = failure.data?.message || failure.message || 'Account action failed'
  }
  finally {
    isBusy.value = false
  }
}
</script>

<template>
  <section aria-labelledby="account-heading">
    <header class="section-heading">
      <h2 id="account-heading">
        Account
      </h2><span class="meta">Password provider</span>
    </header>
    <h3>{{ resetSession ? 'Set new password' : 'Password recovery' }}</h3>
    <form
      v-if="resetSession"
      class="form-stack"
      @submit.prevent="runAction('complete')"
    >
      <label>New password<input
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
        :disabled="isBusy || isLoading"
      ></label>
      <label>Confirm new password<input
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        required
        :disabled="isBusy || isLoading"
      ></label>
      <div class="action-row">
        <button
          type="submit"
          class="button button-primary"
          :disabled="isBusy || isLoading"
        >
          {{ isBusy ? 'Resetting...' : 'Reset password' }}
        </button>
      </div>
    </form>
    <form
      v-else-if="pendingVerification"
      class="form-stack"
      @submit.prevent="runAction('verify')"
    >
      <label>Verification code<input
        v-model="code"
        type="text"
        placeholder="000000"
        inputmode="numeric"
        autocomplete="one-time-code"
        pattern="[0-9]{6}"
        maxlength="6"
        required
        :disabled="isBusy || isLoading"
      ></label>
      <div class="action-row">
        <button
          type="submit"
          class="button button-primary"
          :disabled="isBusy || isLoading"
        >
          Verify code
        </button><button
          type="button"
          class="button"
          :disabled="isBusy || isLoading"
          @click="pendingVerification = false; code = ''; error = ''; success = ''"
        >
          Cancel
        </button>
      </div>
    </form>
    <form
      v-else
      class="form-stack"
      @submit.prevent="runAction('request')"
    >
      <label>Email<input
        v-model="email"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        required
        :disabled="isBusy || isLoading"
      ></label>
      <div class="action-row">
        <button
          type="submit"
          class="button button-primary"
          :disabled="isBusy || isLoading"
        >
          {{ isBusy ? 'Sending...' : 'Send reset code' }}
        </button>
      </div>
    </form>
    <p
      v-if="success"
      class="feedback"
      role="status"
    >
      {{ success }}
    </p>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <NuxtLink
      v-if="success && !pendingVerification"
      to="/sign-in"
    >Go to sign-in</NuxtLink>
    <div
      v-if="!resetSession"
      class="subsection"
    >
      <h3>Change password</h3>
      <p
        v-if="!isLoggedIn || user?.provider !== 'password'"
        class="meta"
      >
        Sign in with the password provider to change your password.
      </p>
      <form @submit.prevent="runAction('change')">
        <fieldset
          class="form-stack form-fields"
          :disabled="isBusy || isLoading || !isLoggedIn || user?.provider !== 'password'"
        >
          <label>Current password<input
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
          ></label>
          <div class="form-grid">
            <label>New password<input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            ></label><label>Confirm new password<input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
            ></label>
          </div>
          <div class="action-row">
            <button
              type="submit"
              class="button"
            >
              {{ isBusy ? 'Updating...' : 'Update password' }}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  </section>
</template>
