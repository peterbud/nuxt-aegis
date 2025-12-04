<script setup lang="ts">
import { useAuth, useNuxtApp } from '#imports'

const apiResponse = ref()
const error = ref<string | null>(null)
const impersonateTargetUserId = ref('')
const impersonateReason = ref('')
const demoResponse = ref()
const { isLoggedIn, user, login, logout, isImpersonating, originalUser, impersonate, stopImpersonation } = useAuth()

// Password authentication state
const passwordMode = ref<'login' | 'register' | 'reset' | null>(null)
const passwordEmail = ref('')
const password = ref('')
const confirmPassword = ref('')
const verificationCode = ref('')
const newPassword = ref('')
const currentPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSuccess = ref<string | null>(null)
const showPasswordChange = ref(false)
const resetSessionId = ref<string | null>(null)
const pendingVerification = ref(false)

const loginWithGoogle = async () => {
  login('google')
}

const loginWithGithub = async () => {
  login('github')
}

const loginWithAuth0 = async () => {
  login('auth0')
}

const loginWithMock = async (userType?: string) => {
  // Navigate to mock provider with optional user parameter
  const url = userType ? `/auth/mock?user=${userType}` : '/auth/mock'
  await navigateTo(url, { external: true })
}

const handleLogout = async () => {
  try {
    await logout()
  }
  catch (err) {
    console.error('Logout failed:', err)
  }
}

const testProtectedRoute = async () => {
  apiResponse.value = null
  error.value = null

  try {
    // This will automatically include the bearer token
    // because /api/user/** is in protectedRoutes
    const data = await useNuxtApp().$api('/api/user/profile')
    apiResponse.value = data || null
    // convert expiresAt to readable date
    if (apiResponse.value && apiResponse.value?.expiresAt) {
      apiResponse.value.expiresAt = new Date(apiResponse.value.expiresAt * 1000).toLocaleString()
    }
  }
  catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to fetch protected route'
  }
}

const handleImpersonate = async () => {
  error.value = null
  demoResponse.value = null

  if (!impersonateTargetUserId.value) {
    error.value = 'Please enter a target user ID or email'
    return
  }

  try {
    await impersonate(impersonateTargetUserId.value, impersonateReason.value || undefined)
    // Clear form
    impersonateTargetUserId.value = ''
    impersonateReason.value = ''
  }
  catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to impersonate user'
  }
}

const handleStopImpersonation = async () => {
  error.value = null
  demoResponse.value = null

  try {
    await stopImpersonation()
  }
  catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to stop impersonation'
  }
}

const testDemoRoute = async () => {
  demoResponse.value = null
  error.value = null

  try {
    const data = await useNuxtApp().$api('/api/admin/impersonate-demo')
    demoResponse.value = data || null
  }
  catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to fetch demo route'
  }
}

// Password authentication functions
const handlePasswordRegister = async () => {
  passwordError.value = null
  passwordSuccess.value = null

  if (!passwordEmail.value || !password.value) {
    passwordError.value = 'Email and password are required'
    return
  }

  if (password.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }

  try {
    const response = await $fetch<{ success: boolean }>('/auth/password/register', {
      method: 'POST',
      body: {
        email: passwordEmail.value,
        password: password.value,
      },
    })

    if (response.success) {
      pendingVerification.value = true
      passwordSuccess.value = 'Registration initiated! Check console for verification code.'
    }
  }
  catch (err) {
    passwordError.value = (err as { data?: { message?: string } }).data?.message || 'Registration failed'
  }
}

const handlePasswordLogin = async () => {
  passwordError.value = null
  passwordSuccess.value = null

  if (!passwordEmail.value || !password.value) {
    passwordError.value = 'Email and password are required'
    return
  }

  try {
    const response = await $fetch<{ success: boolean }>('/auth/password/login', {
      method: 'POST',
      body: {
        email: passwordEmail.value,
        password: password.value,
      },
    })

    if (response.success) {
      pendingVerification.value = true
      passwordSuccess.value = 'Login initiated! Check console for verification code.'
    }
  }
  catch (err) {
    passwordError.value = (err as { data?: { message?: string } }).data?.message || 'Login failed'
  }
}

const handlePasswordReset = async () => {
  passwordError.value = null
  passwordSuccess.value = null

  if (!passwordEmail.value) {
    passwordError.value = 'Email is required'
    return
  }

  try {
    await $fetch('/auth/password/reset-request', {
      method: 'POST',
      body: {
        email: passwordEmail.value,
      },
    })

    pendingVerification.value = true
    passwordSuccess.value = 'If an account exists, a verification code has been sent. Check console.'
  }
  catch (err) {
    passwordError.value = (err as { data?: { message?: string } }).data?.message || 'Request failed'
  }
}

const handleVerifyCode = async () => {
  passwordError.value = null
  passwordSuccess.value = null

  if (!verificationCode.value) {
    passwordError.value = 'Verification code is required'
    return
  }

  try {
    if (passwordMode.value === 'reset') {
      // Reset flow - use GET and follow redirect
      const endpoint = 'reset-verify'
      await navigateTo(`/auth/password/${endpoint}?code=${verificationCode.value}`, { external: true })
    }
    else {
      // Register/login flow - use GET and follow redirect
      const endpoint = passwordMode.value === 'register' ? 'register-verify' : 'login-verify'
      await navigateTo(`/auth/password/${endpoint}?code=${verificationCode.value}`, { external: true })
    }
  }
  catch (err) {
    passwordError.value = (err as { data?: { message?: string } }).data?.message || 'Verification failed'
  }
}

const handleCompleteReset = async () => {
  passwordError.value = null
  passwordSuccess.value = null

  if (!newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Both password fields are required'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }

  if (!resetSessionId.value) {
    passwordError.value = 'Invalid reset session'
    return
  }

  try {
    await $fetch('/auth/password/reset-complete', {
      method: 'POST',
      body: {
        sessionId: resetSessionId.value,
        newPassword: newPassword.value,
      },
    })

    passwordSuccess.value = 'Password reset successful! You can now log in.'
    resetPasswordMode()
  }
  catch (err) {
    passwordError.value = (err as { data?: { message?: string } }).data?.message || 'Password reset failed'
  }
}

const handlePasswordChange = async () => {
  passwordError.value = null
  passwordSuccess.value = null

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'All fields are required'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match'
    return
  }

  try {
    await $fetch('/auth/password/change', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })

    passwordSuccess.value = 'Password changed successfully!'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    showPasswordChange.value = false
  }
  catch (err) {
    passwordError.value = (err as { data?: { message?: string } }).data?.message || 'Password change failed'
  }
}

const resetPasswordMode = () => {
  passwordMode.value = null
  passwordEmail.value = ''
  password.value = ''
  confirmPassword.value = ''
  verificationCode.value = ''
  newPassword.value = ''
  currentPassword.value = ''
  passwordError.value = null
  passwordSuccess.value = null
  pendingVerification.value = false
  resetSessionId.value = null
}
</script>

<template>
  <div class="auth-playground">
    <!-- Header -->
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
            v-if="isLoggedIn"
            class="status-badge status-logged-in"
          >
            Logged In: {{ user?.email }} <span v-if="user?.role">({{ user.role }})</span>
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

    <!-- Impersonation Banner -->
    <div
      v-if="isImpersonating && originalUser"
      class="impersonation-banner"
    >
      <div class="impersonation-content">
        <div class="impersonation-info">
          <div class="impersonation-icon">
            🎭
          </div>
          <div class="impersonation-text">
            <h3>Impersonating User</h3>
            <p>You (<strong>{{ originalUser.originalUserEmail }}</strong>) are impersonating <strong>{{ user?.email }}</strong></p>
            <p
              v-if="user?.impersonation?.reason"
              class="impersonation-reason"
            >
              <span class="reason-label">Reason:</span> {{ user.impersonation.reason }}
            </p>
          </div>
        </div>
        <button
          class="btn btn-impersonate-end"
          @click="handleStopImpersonation"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
          End Impersonation
        </button>
      </div>
    </div>

    <!-- Main Content: 3 Column Layout -->
    <div class="main-container">
      <!-- Column 1: Login Methods -->
      <div class="column column-login">
        <div class="card">
          <h2 class="card-title">
            Social & Enterprise Login
          </h2>

          <div
            v-if="!isLoggedIn"
            class="login-methods"
          >
            <button
              class="btn-provider btn-google"
              @click="loginWithGoogle"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <button
              class="btn-provider btn-auth0"
              @click="loginWithAuth0"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21.98 7.448L19.62 0H4.347L2.02 7.448c-1.352 4.312.03 9.206 3.815 12.015L12.007 24l6.157-4.537c3.785-2.808 5.167-7.703 3.815-12.015zm-6.457 2.07v5.568L12 17.79l-3.557-2.704v-5.568h7.08z" />
              </svg>
              Continue with Auth0
            </button>

            <button
              class="btn-provider btn-github"
              @click="loginWithGithub"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div
            v-if="!isLoggedIn"
            class="card section-mock"
          >
            <h3 class="section-title">
              Mock Provider
            </h3>
            <p class="section-description">
              Perfect for testing without OAuth setup
            </p>
            <div class="btn-group">
              <button
                class="btn btn-success"
                @click="loginWithMock()"
              >
                Login as Regular User
              </button>
              <button
                class="btn btn-danger"
                @click="loginWithMock('admin')"
              >
                Login as Admin
              </button>
              <button
                class="btn btn-warning"
                @click="loginWithMock('premium')"
              >
                Login as Premium
              </button>
            </div>
          </div>

          <div
            v-if="!isLoggedIn"
            class="card section-password"
          >
            <h3 class="section-title">
              Username/Password
            </h3>

            <div
              v-if="!passwordMode"
              class="btn-group"
            >
              <button
                class="btn btn-primary"
                @click="passwordMode = 'login'"
              >
                Login with Password
              </button>
              <button
                class="btn btn-success"
                @click="passwordMode = 'register'"
              >
                Register New Account
              </button>
              <button
                class="btn btn-warning"
                @click="passwordMode = 'reset'"
              >
                Reset Password
              </button>
            </div>

            <!-- Password Forms -->
            <div
              v-if="passwordMode === 'register' && !pendingVerification"
              class="form"
            >
              <h4>Register New Account</h4>
              <input
                v-model="passwordEmail"
                type="email"
                placeholder="Email"
                class="input"
              >
              <input
                v-model="password"
                type="password"
                placeholder="Password (min 8 chars)"
                class="input"
              >
              <input
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                class="input"
              >
              <div class="btn-group">
                <button
                  class="btn btn-success"
                  @click="handlePasswordRegister"
                >
                  Register
                </button>
                <button
                  class="btn btn-secondary"
                  @click="resetPasswordMode"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div
              v-if="passwordMode === 'login' && !pendingVerification"
              class="form"
            >
              <h4>Login with Password</h4>
              <input
                v-model="passwordEmail"
                type="email"
                placeholder="Email"
                class="input"
              >
              <input
                v-model="password"
                type="password"
                placeholder="Password"
                class="input"
              >
              <div class="btn-group">
                <button
                  class="btn btn-primary"
                  @click="handlePasswordLogin"
                >
                  Login
                </button>
                <button
                  class="btn btn-secondary"
                  @click="resetPasswordMode"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div
              v-if="passwordMode === 'reset' && !pendingVerification && !resetSessionId"
              class="form"
            >
              <h4>Reset Password</h4>
              <input
                v-model="passwordEmail"
                type="email"
                placeholder="Email"
                class="input"
              >
              <div class="btn-group">
                <button
                  class="btn btn-warning"
                  @click="handlePasswordReset"
                >
                  Send Reset Code
                </button>
                <button
                  class="btn btn-secondary"
                  @click="resetPasswordMode"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div
              v-if="pendingVerification && !resetSessionId"
              class="form"
            >
              <h4>Enter Verification Code</h4>
              <p class="hint">
                Check the console for the 6-digit code
              </p>
              <input
                v-model="verificationCode"
                type="text"
                placeholder="6-digit code"
                maxlength="6"
                class="input"
              >
              <div class="btn-group">
                <button
                  class="btn btn-primary"
                  @click="handleVerifyCode"
                >
                  Verify Code
                </button>
                <button
                  class="btn btn-secondary"
                  @click="resetPasswordMode"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div
              v-if="resetSessionId"
              class="form"
            >
              <h4>Set New Password</h4>
              <input
                v-model="newPassword"
                type="password"
                placeholder="New Password"
                class="input"
              >
              <input
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm New Password"
                class="input"
              >
              <div class="btn-group">
                <button
                  class="btn btn-warning"
                  @click="handleCompleteReset"
                >
                  Reset Password
                </button>
                <button
                  class="btn btn-secondary"
                  @click="resetPasswordMode"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div
              v-if="passwordSuccess"
              class="alert alert-success"
            >
              {{ passwordSuccess }}
            </div>
            <div
              v-if="passwordError"
              class="alert alert-error"
            >
              {{ passwordError }}
            </div>
          </div>

          <div
            v-if="isLoggedIn"
            class="logged-in-message"
          >
            <p>✓ You are authenticated</p>
          </div>
        </div>
      </div>

      <!-- Column 2: Authenticated Actions -->
      <div class="column column-actions">
        <div class="card">
          <h2 class="card-title">
            Authenticated Actions
          </h2>

          <div v-if="isLoggedIn">
            <button
              class="btn btn-primary btn-block"
              @click="testProtectedRoute"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <path d="M12 6v6l4 2" />
              </svg>
              Call Protected API Endpoint
            </button>

            <div
              v-if="apiResponse"
              class="response-box"
            >
              <h4>API Response:</h4>
              <pre>{{ JSON.stringify(apiResponse, null, 2) }}</pre>
            </div>

            <div
              v-if="error"
              class="alert alert-error"
            >
              <h4>Error:</h4>
              <pre>{{ error }}</pre>
            </div>
          </div>

          <div
            v-else
            class="empty-state"
          >
            <p>Please log in to test authenticated actions</p>
          </div>
        </div>

        <!-- Admin Actions -->
        <div
          v-if="user?.role === 'admin' && !isImpersonating"
          class="card section-admin"
        >
          <h3 class="section-title">
            Admin Actions
          </h3>
          <p class="section-description">
            These actions are only available to admin users.
          </p>

          <div class="form">
            <label class="label">User ID to Impersonate</label>
            <input
              v-model="impersonateTargetUserId"
              type="text"
              placeholder="Enter user ID, e.g., 'user-123'"
              class="input"
            >

            <label class="label">Reason (optional)</label>
            <textarea
              v-model="impersonateReason"
              placeholder="e.g., Debugging user issue"
              class="textarea"
              rows="3"
            />

            <div class="btn-group">
              <button
                class="btn btn-primary"
                @click="handleImpersonate"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle
                    cx="8.5"
                    cy="7"
                    r="4"
                  />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
                Impersonate
              </button>
              <button
                v-if="isImpersonating"
                class="btn btn-danger"
                @click="handleStopImpersonation"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  />
                </svg>
                End Impersonation
              </button>
            </div>

            <div
              v-if="isImpersonating"
              class="btn-group"
            >
              <button
                class="btn btn-primary"
                @click="testDemoRoute"
              >
                Test Impersonation Demo API
              </button>
            </div>

            <div
              v-if="demoResponse"
              class="response-box"
            >
              <h4>Impersonation Demo Response:</h4>
              <pre>{{ JSON.stringify(demoResponse, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- Password Change -->
        <div
          v-if="isLoggedIn && (user?.provider === 'password' || user?.providers?.some((p: any) => p.name === 'password'))"
          class="card"
        >
          <h3 class="section-title">
            🔑 Change Password
          </h3>

          <button
            v-if="!showPasswordChange"
            class="btn btn-warning"
            @click="showPasswordChange = true"
          >
            Change My Password
          </button>

          <div
            v-if="showPasswordChange"
            class="form"
          >
            <input
              v-model="currentPassword"
              type="password"
              placeholder="Current Password"
              class="input"
            >
            <input
              v-model="newPassword"
              type="password"
              placeholder="New Password"
              class="input"
            >
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="Confirm New Password"
              class="input"
            >
            <div class="btn-group">
              <button
                class="btn btn-warning"
                @click="handlePasswordChange"
              >
                Update Password
              </button>
              <button
                class="btn btn-secondary"
                @click="showPasswordChange = false; currentPassword = ''; newPassword = ''; confirmPassword = ''; passwordError = null; passwordSuccess = null"
              >
                Cancel
              </button>
            </div>
            <div
              v-if="passwordSuccess"
              class="alert alert-success"
            >
              {{ passwordSuccess }}
            </div>
            <div
              v-if="passwordError"
              class="alert alert-error"
            >
              {{ passwordError }}
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: Session Data -->
      <div class="column column-session">
        <div class="card">
          <h2 class="card-title">
            Current Session Data
          </h2>

          <div
            v-if="isLoggedIn && user"
            class="session-data"
          >
            <pre class="session-json">{{ JSON.stringify({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                provider: user.provider,
              },
              loggedIn: true,
              impersonating: isImpersonating,
              token: '...',
            }, null, 2) }}</pre>
          </div>

          <div
            v-else
            class="empty-state"
          >
            <p>No active session</p>
            <p class="hint">
              Log in to see session data
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Theme */
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

  /* Brand colors */
  --color-primary: #4299e1;
  --color-primary-dark: #2b6cb0;
  --color-success: #48bb78;
  --color-success-dark: #2f855a;
  --color-warning: #ed8936;
  --color-warning-dark: #c05621;
  --color-danger: #f56565;
  --color-danger-dark: #c53030;
  --color-secondary: #718096;

  /* Status colors */
  --status-success-bg: #c6f6d5;
  --status-success-text: #22543d;
  --status-error-bg: #fed7d7;
  --status-error-text: #742a2a;
  --status-info-bg: #bee3f8;
  --status-info-text: #2c5282;
  --status-warning-bg: #feebc8;
  --status-warning-text: #7c2d12;
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

    /* Adjusted status colors for dark mode */
    --status-success-bg: #1b4332;
    --status-success-text: #74c69d;
    --status-error-bg: #5a1a1a;
    --status-error-text: #fca5a5;
    --status-info-bg: #1e3a5f;
    --status-info-text: #93c5fd;
    --status-warning-bg: #5a2d0c;
    --status-warning-text: #fdba74;
  }
}

* {
  box-sizing: border-box;
}

.auth-playground {
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
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-logged-in {
  background: var(--status-success-bg);
  color: var(--status-success-text);
}

/* Impersonation Banner */
.impersonation-banner {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-bottom: 3px solid var(--color-warning);
  padding: 1.25rem 2rem;
  box-shadow: 0 2px 8px rgba(237, 137, 54, 0.15);
}

.impersonation-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.impersonation-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
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

.impersonation-text {
  flex: 1;
}

.impersonation-content h3 {
  margin: 0 0 0.375rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.impersonation-content p {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.impersonation-content p strong {
  color: var(--text-primary);
  font-weight: 600;
}

.impersonation-reason {
  margin-top: 0.5rem !important;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-left: 3px solid var(--color-warning);
  border-radius: 0.25rem;
  font-style: italic;
}

.reason-label {
  font-weight: 600;
  font-style: normal;
  color: var(--text-primary);
}

.btn-impersonate-end {
  background: var(--color-danger);
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-impersonate-end:hover {
  background: var(--color-danger-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(245, 101, 101, 0.3);
}

@media (prefers-color-scheme: dark) {
  .impersonation-banner {
    background: linear-gradient(135deg, #22272e 0%, #2d3339 100%);
    border-bottom: 3px solid var(--color-warning);
    box-shadow: 0 2px 8px rgba(237, 137, 54, 0.25);
  }

  .impersonation-icon {
    background: var(--color-warning);
    box-shadow: 0 2px 4px rgba(237, 137, 54, 0.3);
  }
}

/* Main Container - 3 Column Layout */
.main-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1400px) {
  .main-container {
    grid-template-columns: 1fr;
  }
}

.column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
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
}

/* Login Methods */
.login-methods {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-provider:hover {
  background: var(--bg-tertiary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  border-color: var(--color-primary);
}

.btn-google {
  background: white;
  color: #1a202c;
  border-color: #e2e8f0;
}

.btn-google:hover {
  background: #f7fafc;
  border-color: #4285F4;
}

.btn-google svg {
  width: 18px;
  height: 18px;
}

.btn-auth0 {
  background: #eb5424;
  color: white;
  border-color: #eb5424;
}

.btn-auth0:hover {
  background: #d04a20;
  border-color: #d04a20;
}

.btn-github {
  background: #24292e;
  color: white;
  border-color: #24292e;
}

.btn-github:hover {
  background: #1b1f23;
  border-color: #1b1f23;
}

@media (prefers-color-scheme: dark) {
  .btn-google {
    background: #f7fafc;
    color: #1a202c;
    border-color: #cbd5e0;
  }

  .btn-google:hover {
    background: #e2e8f0;
    border-color: #4285F4;
  }
}

/* Sections */
.section-mock,
.section-password,
.section-admin {
  margin-top: 1rem;
  padding: 1.25rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

.btn-warning {
  background: var(--color-warning);
  color: white;
}

.btn-warning:hover {
  background: var(--color-warning-dark);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-danger:hover {
  background: var(--color-danger-dark);
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
}

.btn-secondary:hover {
  background: #4a5568;
}

.btn-logout {
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: var(--color-danger);
  color: white;
}

.btn-block {
  width: 100%;
}

.btn-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Forms */
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.form h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.input,
.textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: all 0.2s;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.hint {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  margin: 0;
}

/* Alerts */
.alert {
  padding: 0.875rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.alert-success {
  background: var(--status-success-bg);
  color: var(--status-success-text);
  border: 1px solid var(--color-success);
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

/* Response Box */
.response-box {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
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

/* Session Data */
.session-data {
  margin-top: 1rem;
}

.session-json {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  margin: 0;
  border: 1px solid var(--border-color);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-tertiary);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-state p {
  margin: 0.5rem 0;
}

.empty-state .hint {
  font-size: 0.875rem;
}

/* Logged In Message */
.logged-in-message {
  text-align: center;
  padding: 2rem 1rem;
}

.logged-in-message p {
  margin: 0;
  font-size: 1rem;
  color: var(--color-success);
  font-weight: 500;
}
</style>
