<template>
  <section aria-labelledby="logout-heading">
    <header class="section-heading">
      <h2 id="logout-heading">
        Logged Out Successfully
      </h2><span class="meta">Session ended</span>
    </header>
    <p
      class="feedback"
      role="status"
    >
      You have been successfully logged out from Nuxt Aegis.
    </p>
    <div class="action-row">
      <NuxtLink
        to="/sign-in"
        class="button button-primary"
      >Sign in again</NuxtLink>
      <NuxtLink
        to="/"
        class="button"
      >Return to Home</NuxtLink>
    </div>
  </section>
</template>
