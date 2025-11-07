<script setup lang="ts">
import { useAuth, useNuxtApp } from '#imports'

const apiResponse = ref()
const error = ref<string | null>(null)
const { isLoggedIn, user, login, logout } = useAuth()

const loginWithGoogle = async () => {
  login('google')
}

const loginWithGithub = async () => {
  login('github')
}

const loginWithAuth0 = async () => {
  login('auth0')
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
      <button
        v-if="isLoggedIn"
        style="padding: 10px 20px; font-size: 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
        @click="handleLogout"
      >
        Logout
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

      <div style="margin-top: 20px;">
        <button
          style="padding: 10px 20px; margin-right: 10px;"
          @click="testProtectedRoute"
        >
          Test Protected Route (Auto Token)
        </button>
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
