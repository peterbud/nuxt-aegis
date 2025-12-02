<script setup lang="ts">
import { useAuth } from '#imports'

const { user, login, logout } = useAuth()
</script>

<template>
  <div class="container">
    <h1>Nuxt Aegis - Minimal Example</h1>

    <div
      v-if="!user"
      class="auth-section"
    >
      <p>You are not logged in</p>
      <button
        class="btn"
        @click="login('google')"
      >
        Sign in with Google
      </button>
    </div>

    <div
      v-else
      class="auth-section"
    >
      <h2>Welcome, {{ user.name }}!</h2>
      <div class="user-info">
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Provider:</strong> {{ user.provider }}</p>
        <img
          v-if="user.picture"
          :src="user.picture"
          alt="Profile picture"
          class="profile-pic"
        >
      </div>
      <button
        class="btn btn-secondary"
        @click="logout"
      >
        Log out
      </button>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 30px;
}

h2 {
  color: #555;
  margin-bottom: 20px;
}

.auth-section {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
}

.user-info {
  background: white;
  border-radius: 6px;
  padding: 20px;
  margin: 20px 0;
  text-align: left;
}

.user-info p {
  margin: 10px 0;
}

.profile-pic {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-top: 15px;
}

.btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn:hover {
  background: #357ae8;
}

.btn-secondary {
  background: #dc3545;
}

.btn-secondary:hover {
  background: #c82333;
}

p {
  color: #666;
  margin: 15px 0;
}
</style>
