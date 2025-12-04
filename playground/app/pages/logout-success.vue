<template>
  <div class="container">
    <div class="card">
      <h1>👋 Logged Out</h1>
      <p>You have been successfully logged out.</p>
      <p>Thank you for using Nuxt Aegis!</p>
      <NuxtLink
        to="/"
        class="button"
      >
        Return to Home
      </NuxtLink>
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
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background 0.2s;
}

.button:hover {
  background: #2563eb;
}
</style>
