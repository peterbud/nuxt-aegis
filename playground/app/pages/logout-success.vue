<template>
  <div class="logout-page">
    <div class="container">
      <div class="card">
        <div class="icon-wrapper">
          <div class="success-icon">
            👋
          </div>
        </div>
        <h1>Logged Out Successfully</h1>
        <p class="message">
          You have been successfully logged out from Nuxt Aegis.
        </p>
        <p class="sub-message">
          Thank you for using our authentication system!
        </p>
        <div class="actions">
          <NuxtLink
            to="/"
            class="button button-primary"
          >
            <span>🏠</span>
            Return to Home
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Theme */
.logout-page {
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

  /* Status colors */
  --status-success-bg: #c6f6d5;
  --status-success-text: #22543d;
}

@media (prefers-color-scheme: dark) {
  .logout-page {
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
  }
}

* {
  box-sizing: border-box;
}

.logout-page {
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
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.success-icon {
  font-size: 4rem;
  line-height: 1;
  background: var(--status-success-bg);
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.2);
}

h1 {
  font-size: 2rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-weight: 600;
}

.message {
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  line-height: 1.6;
}

.sub-message {
  color: var(--text-tertiary);
  margin: 0 0 2rem 0;
  font-size: 0.9375rem;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
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

.button-primary {
  background: var(--color-primary);
  color: white;
}

.button-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>
