<script setup lang="ts">
definePageMeta({ alias: ['/sign-in'] })

const { isLoggedIn, isLoading, login } = useAuth()
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const pendingVerification = ref(false)
const isBusy = ref(false)
const error = ref('')
const success = ref('')

async function signIn(provider: string, identity?: string) {
  error.value = ''
  isBusy.value = true
  try {
    if (provider === 'mock') {
      const query = new URLSearchParams({ user: identity || 'user', redirectTo: '/sign-in' })
      await navigateTo(`/auth/mock?${query}`, { external: true })
    }
    else {
      await login(provider, '/sign-in')
    }
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Sign-in failed'
  }
  finally {
    isBusy.value = false
  }
}

function resetPasswordFlow() {
  pendingVerification.value = false
  password.value = ''
  confirmPassword.value = ''
  code.value = ''
  error.value = ''
  success.value = ''
}

async function submitPassword() {
  error.value = ''
  success.value = ''
  if (mode.value === 'register' && password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  isBusy.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/auth/password/${mode.value}`, {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    if (response.success) {
      pendingVerification.value = true
      password.value = ''
      confirmPassword.value = ''
      success.value = 'Verification code sent. Check the development server console or your email.'
    }
  }
  catch (cause) {
    const failure = cause as { data?: { message?: string }, message?: string }
    error.value = failure.data?.message || failure.message || 'Password authentication failed'
  }
  finally {
    isBusy.value = false
  }
}

async function verifyCode() {
  error.value = ''
  isBusy.value = true
  try {
    const response = await fetch(`/auth/password/${mode.value}-verify?${new URLSearchParams({ code: code.value })}`)
    if (!response.ok) {
      const failure = await response.json() as { message?: string }
      throw new Error(failure.message || 'Verification failed')
    }
    const destination = new URL(response.url)
    if (destination.pathname !== '/auth/callback') {
      throw new Error('Unexpected verification destination')
    }
    destination.searchParams.set('redirectTo', '/sign-in')
    await navigateTo(`${destination.pathname}${destination.search}`, { external: true })
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Verification failed'
  }
  finally {
    isBusy.value = false
  }
}

const identities = [
  { id: 'user', name: 'Regular user', email: 'user@example.com', role: 'User' },
  { id: 'admin', name: 'Admin user', email: 'admin@example.com', role: 'Admin' },
  { id: 'premium', name: 'Premium user', email: 'premium@example.com', role: 'User · Premium' },
]
</script>

<template>
  <section aria-labelledby="sign-in-heading">
    <header class="section-heading">
      <h2 id="sign-in-heading">
        Sign-in
      </h2>
      <span class="meta">Public</span>
    </header>
    <p
      v-if="isLoggedIn"
      class="feedback"
      role="status"
    >
      You are signed in. Sign out to test another login.
    </p>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <h3 class="subsection">
      Mock identities
    </h3>
    <ul class="identity-list">
      <li
        v-for="identity in identities"
        :key="identity.email"
      >
        <div class="identity">
          <span
            class="avatar"
            aria-hidden="true"
          >{{ identity.name.slice(0, 1) }}</span>
          <div><strong>{{ identity.name }}</strong><small>{{ identity.email }}</small></div>
        </div>
        <div class="identity-action">
          <span class="meta">{{ identity.role }}</span>
          <button
            type="button"
            class="button"
            :disabled="isBusy || isLoggedIn || isLoading"
            @click="signIn('mock', identity.id)"
          >
            Sign in
          </button>
        </div>
      </li>
    </ul>
    <div class="subsection">
      <h3>External providers</h3>
      <div class="provider-actions">
        <button
          v-for="provider in ['google', 'github', 'auth0']"
          :key="provider"
          type="button"
          class="button"
          :disabled="isBusy || isLoggedIn || isLoading"
          @click="signIn(provider)"
        >
          {{ provider === 'auth0' ? 'Auth0' : provider === 'github' ? 'GitHub' : 'Google' }}
        </button>
      </div>
    </div>
    <div class="subsection">
      <h3>Password authentication</h3>
      <fieldset
        class="mode-selector"
        :disabled="isBusy || pendingVerification || isLoggedIn || isLoading"
      >
        <legend class="sr-only">
          Password flow
        </legend>
        <label><input
          v-model="mode"
          type="radio"
          name="password-mode"
          value="login"
          @change="resetPasswordFlow"
        > Login</label>
        <label><input
          v-model="mode"
          type="radio"
          name="password-mode"
          value="register"
          @change="resetPasswordFlow"
        > Register</label>
      </fieldset>
      <form
        v-if="!pendingVerification"
        @submit.prevent="submitPassword"
      >
        <fieldset
          class="form-stack form-fields"
          :disabled="isBusy || isLoggedIn || isLoading"
        >
          <div class="form-grid">
            <label>Email<input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
            ></label>
            <label>Password<input
              v-model="password"
              type="password"
              placeholder="Password"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              :minlength="mode === 'register' ? 8 : undefined"
              required
            ></label>
          </div>
          <label v-if="mode === 'register'">Confirm password<input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
          ></label>
          <div class="action-row">
            <button
              type="submit"
              class="button button-primary"
            >
              {{ isBusy ? 'Submitting...' : mode === 'register' ? 'Register' : 'Continue' }}
            </button>
            <NuxtLink to="/account">Password recovery</NuxtLink>
          </div>
        </fieldset>
      </form>
      <form
        v-else
        class="form-stack"
        @submit.prevent="verifyCode"
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
          :disabled="isBusy"
        ></label>
        <div class="action-row">
          <button
            type="submit"
            class="button button-primary"
            :disabled="isBusy"
          >
            Verify code
          </button>
          <button
            type="button"
            class="button"
            :disabled="isBusy"
            @click="resetPasswordFlow"
          >
            Cancel
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
    </div>
  </section>
</template>
