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
    await logout('/')
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
  <div style="padding: 20px; font-family: sans-serif;">
    <h1>Nuxt Aegis - JWT Token Demo</h1>

    <div style="margin: 20px 0;">
      <button
        v-if="!isLoggedIn"
        style="padding: 10px 20px; font-size: 16px; margin-right: 10px;"
        @click="loginWithGoogle"
      >
        Login with Google
      </button>
      <button
        v-if="!isLoggedIn"
        style="padding: 10px 20px; font-size: 16px; margin-right: 10px; background-color: #24292e; color: white; border: none; border-radius: 4px; cursor: pointer;"
        @click="loginWithGithub"
      >
        Login with GitHub
      </button>
      <button
        v-if="!isLoggedIn"
        style="padding: 10px 20px; font-size: 16px; margin-right: 10px; background-color: #eb5424; color: white; border: none; border-radius: 4px; cursor: pointer;"
        @click="loginWithAuth0"
      >
        Login with Auth0
      </button>
      <!-- Mock provider login options -->
      <div
        v-if="!isLoggedIn"
        style="margin: 15px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;"
      >
        <h3 style="margin-top: 0;">
          🧪 Mock Provider (No Credentials Needed)
        </h3>
        <p style="margin: 5px 0; color: #856404;">
          Perfect for testing without OAuth setup
        </p>
        <button
          style="padding: 8px 16px; margin-right: 8px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;"
          @click="loginWithMock()"
        >
          Login as Regular User
        </button>
        <button
          style="padding: 8px 16px; margin-right: 8px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
          @click="loginWithMock('admin')"
        >
          Login as Admin
        </button>
        <button
          style="padding: 8px 16px; background-color: #ffc107; color: #000; border: none; border-radius: 4px; cursor: pointer;"
          @click="loginWithMock('premium')"
        >
          Login as Premium
        </button>
      </div>

      <!-- Password authentication forms -->
      <div
        v-if="!isLoggedIn"
        style="margin: 15px 0; padding: 15px; background: #e3f2fd; border: 1px solid #2196F3; border-radius: 5px;"
      >
        <h3 style="margin-top: 0;">
          🔐 Password Authentication
        </h3>

        <div
          v-if="!passwordMode"
          style="display: flex; gap: 8px; flex-wrap: wrap;"
        >
          <button
            style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;"
            @click="passwordMode = 'login'"
          >
            Login with Password
          </button>
          <button
            style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;"
            @click="passwordMode = 'register'"
          >
            Register New Account
          </button>
          <button
            style="padding: 8px 16px; background-color: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;"
            @click="passwordMode = 'reset'"
          >
            Reset Password
          </button>
        </div>

        <!-- Registration Form -->
        <div
          v-if="passwordMode === 'register' && !pendingVerification"
          style="margin-top: 10px;"
        >
          <h4 style="margin: 10px 0;">
            Register New Account
          </h4>
          <input
            v-model="passwordEmail"
            type="email"
            placeholder="Email"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <input
            v-model="password"
            type="password"
            placeholder="Password (min 8 chars, uppercase, lowercase, number)"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <div style="display: flex; gap: 8px;">
            <button
              style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="handlePasswordRegister"
            >
              Register
            </button>
            <button
              style="padding: 8px 16px; background-color: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="resetPasswordMode"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Login Form -->
        <div
          v-if="passwordMode === 'login' && !pendingVerification"
          style="margin-top: 10px;"
        >
          <h4 style="margin: 10px 0;">
            Login with Password
          </h4>
          <input
            v-model="passwordEmail"
            type="email"
            placeholder="Email"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <div style="display: flex; gap: 8px;">
            <button
              style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="handlePasswordLogin"
            >
              Login
            </button>
            <button
              style="padding: 8px 16px; background-color: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="resetPasswordMode"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Reset Request Form -->
        <div
          v-if="passwordMode === 'reset' && !pendingVerification && !resetSessionId"
          style="margin-top: 10px;"
        >
          <h4 style="margin: 10px 0;">
            Reset Password
          </h4>
          <input
            v-model="passwordEmail"
            type="email"
            placeholder="Email"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <div style="display: flex; gap: 8px;">
            <button
              style="padding: 8px 16px; background-color: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="handlePasswordReset"
            >
              Send Reset Code
            </button>
            <button
              style="padding: 8px 16px; background-color: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="resetPasswordMode"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Verification Code Form -->
        <div
          v-if="pendingVerification && !resetSessionId"
          style="margin-top: 10px;"
        >
          <h4 style="margin: 10px 0;">
            Enter Verification Code
          </h4>
          <p style="color: #666; font-size: 0.9em;">
            Check the console for the 6-digit code
          </p>
          <input
            v-model="verificationCode"
            type="text"
            placeholder="6-digit code"
            maxlength="6"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <div style="display: flex; gap: 8px;">
            <button
              style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="handleVerifyCode"
            >
              Verify Code
            </button>
            <button
              style="padding: 8px 16px; background-color: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="resetPasswordMode"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Reset Complete Form -->
        <div
          v-if="resetSessionId"
          style="margin-top: 10px;"
        >
          <h4 style="margin: 10px 0;">
            Set New Password
          </h4>
          <input
            v-model="newPassword"
            type="password"
            placeholder="New Password (min 8 chars, uppercase, lowercase, number)"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm New Password"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <div style="display: flex; gap: 8px;">
            <button
              style="padding: 8px 16px; background-color: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="handleCompleteReset"
            >
              Reset Password
            </button>
            <button
              style="padding: 8px 16px; background-color: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="resetPasswordMode"
            >
              Cancel
            </button>
          </div>
        </div>

        <div
          v-if="passwordSuccess"
          style="margin-top: 10px; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; color: #155724;"
        >
          {{ passwordSuccess }}
        </div>

        <div
          v-if="passwordError"
          style="margin-top: 10px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24;"
        >
          {{ passwordError }}
        </div>
      </div>
      <button
        v-if="isLoggedIn"
        style="padding: 10px 20px; font-size: 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
        @click="handleLogout"
      >
        Logout
      </button>
    </div>

    <!-- Impersonation Banner (shown when impersonating) -->
    <div
      v-if="isImpersonating && originalUser"
      style="margin: 20px 0; padding: 15px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 5px;"
    >
      <h3 style="margin: 0 0 10px 0; color: #856404;">
        🎭 Impersonating User
      </h3>
      <p style="margin: 5px 0; color: #856404;">
        You ({{ originalUser.originalUserEmail }}) are currently impersonating {{ user?.email }}
      </p>
      <p style="margin: 5px 0; font-size: 0.9em; color: #856404;">
        Impersonated at: {{ user?.impersonation?.impersonatedAt }}
      </p>
      <p
        v-if="user?.impersonation?.reason"
        style="margin: 5px 0; font-size: 0.9em; color: #856404;"
      >
        Reason: {{ user.impersonation.reason }}
      </p>
      <button
        style="margin-top: 10px; padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
        @click="handleStopImpersonation"
      >
        Stop Impersonation
      </button>
    </div>

    <div
      v-if="isLoggedIn"
      style="margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 5px;"
    >
      <h2>Authentication Status: ✓ Authenticated</h2>
      <p>The bearer token is automatically added to all protected routes!</p>

      <div
        v-if="user"
        style="margin: 15px 0; padding: 10px; background: #e8f5e9; border-radius: 5px;"
      >
        <h3>User Information:</h3>
        <div style="display: flex; align-items: center; gap: 15px;">
          <img
            v-if="user.picture"
            :src="user.picture"
            :alt="user.name || 'User'"
            style="width: 50px; height: 50px; border-radius: 50%;"
          >
          <div>
            <p
              v-if="user.name"
              style="margin: 0; font-weight: bold;"
            >
              {{ user.name }}
            </p>
            <p
              v-if="user.email"
              style="margin: 0; color: #666;"
            >
              {{ user.email }}
            </p>
            <p
              v-if="user.sub"
              style="margin: 0; color: #999;"
            >
              ID: {{ user.sub }}
            </p>
            <p
              v-if="user.role"
              style="margin: 5px 0 0 0;"
            >
              Role: <strong>{{ user.role }}</strong>
            </p>
            <p
              v-if="user.permissions && Array.isArray(user.permissions)"
              style="margin: 5px 0 0 0;"
            >
              Permissions: <strong>{{ user.permissions.join(', ') }}</strong>
            </p>
            <p
              v-if="user.organizationId"
              style="margin: 5px 0 0 0;"
            >
              Organization: <strong>{{ user.organizationId }}</strong>
            </p>
          </div>
        </div>
      </div>

      <!-- Impersonation Controls (for admins only) -->
      <div
        v-if="user?.role === 'admin' && !isImpersonating"
        style="margin: 15px 0; padding: 15px; background: #e3f2fd; border: 1px solid #2196F3; border-radius: 5px;"
      >
        <h3 style="margin-top: 0; color: #1976D2;">
          🔐 Admin: User Impersonation
        </h3>
        <p style="margin: 5px 0; color: #1565C0; font-size: 0.9em;">
          Impersonate another user for debugging and support. Sessions expire in 15 minutes.
        </p>
        <div style="margin-top: 10px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            Target User (ID or Email):
          </label>
          <input
            v-model="impersonateTargetUserId"
            type="text"
            placeholder="e.g., user@example.com or 2"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px;"
          >
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            Reason (optional):
          </label>
          <textarea
            v-model="impersonateReason"
            placeholder="e.g., Debugging user issue #123"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px; min-height: 60px;"
          />
          <button
            style="padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
            @click="handleImpersonate"
          >
            Start Impersonation
          </button>
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #fff9c4; border-radius: 4px; font-size: 0.85em;">
          <strong>💡 Try these:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li><code>user@example.com</code> or <code>2</code> - Regular user</li>
            <li><code>premium@example.com</code> or <code>3</code> - Premium user</li>
          </ul>
        </div>
      </div>

      <!-- Password Change (for password-authenticated users) -->
      <div
        v-if="user?.provider === 'password' || user?.providers?.some((p: any) => p.name === 'password')"
        style="margin: 15px 0; padding: 15px; background: #fff3e0; border: 1px solid #FF9800; border-radius: 5px;"
      >
        <h3 style="margin-top: 0; color: #E65100;">
          🔑 Change Password
        </h3>

        <button
          v-if="!showPasswordChange"
          style="padding: 8px 16px; background-color: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;"
          @click="showPasswordChange = true"
        >
          Change My Password
        </button>

        <div
          v-if="showPasswordChange"
          style="margin-top: 10px;"
        >
          <input
            v-model="currentPassword"
            type="password"
            placeholder="Current Password"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <input
            v-model="newPassword"
            type="password"
            placeholder="New Password (min 8 chars, uppercase, lowercase, number)"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm New Password"
            style="width: 100%; max-width: 400px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; display: block;"
          >
          <div style="display: flex; gap: 8px;">
            <button
              style="padding: 8px 16px; background-color: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="handlePasswordChange"
            >
              Update Password
            </button>
            <button
              style="padding: 8px 16px; background-color: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer;"
              @click="showPasswordChange = false; currentPassword = ''; newPassword = ''; confirmPassword = ''; passwordError = null; passwordSuccess = null"
            >
              Cancel
            </button>
          </div>

          <div
            v-if="passwordSuccess"
            style="margin-top: 10px; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; color: #155724;"
          >
            {{ passwordSuccess }}
          </div>

          <div
            v-if="passwordError"
            style="margin-top: 10px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24;"
          >
            {{ passwordError }}
          </div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <button
          style="padding: 10px 20px; margin-right: 10px;"
          @click="testProtectedRoute"
        >
          Test Protected Route (Auto Token)
        </button>
        <button
          v-if="isImpersonating"
          style="padding: 10px 20px; margin-right: 10px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;"
          @click="testDemoRoute"
        >
          Test Impersonation Demo API
        </button>
      </div>

      <div
        v-if="demoResponse"
        style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;"
      >
        <h3>Impersonation Demo API Response:</h3>
        <pre style="white-space: pre-wrap;">{{ JSON.stringify(demoResponse, null, 2) }}</pre>
      </div>

      <div
        v-if="apiResponse"
        style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 5px;"
      >
        <h3>API Response:</h3>
        <pre style="white-space: pre-wrap;">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
      </div>

      <div
        v-if="error"
        style="margin-top: 20px; padding: 15px; background: #ffebee; border-radius: 5px; color: #c62828;"
      >
        <h3>Error:</h3>
        <pre>{{ error }}</pre>
      </div>
    </div>

    <div
      v-else
      style="margin: 20px 0; padding: 15px; background: #fff3e0; border-radius: 5px;"
    >
      <p>Please login to test the JWT token functionality.</p>
    </div>

    <div style="margin-top: 40px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
      <h3>How it works:</h3>
      <ul>
        <li>The module automatically reads the token from the session storage</li>
        <li>When you make requests to protected routes (configured in nuxt.config.ts), the token is automatically added</li>
        <li>Protected routes in this demo: <code>/api/**</code></li>
        <li>The middleware handles token verification and user authentication on server side</li>
      </ul>
    </div>
  </div>
</template>
