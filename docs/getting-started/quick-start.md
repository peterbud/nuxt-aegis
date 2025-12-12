# Quick Start

Get your first authentication flow working in minutes.

## Basic Configuration

Add the Nuxt Aegis configuration to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!, // Required
    },
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  },
})
```

::: tip Minimal Configuration
This is the minimal configuration needed. For production applications, see the [Configuration](/configuration/) section for all available options.
:::

## Create Auth Route

Create a server route handler for Google OAuth:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
  },
})
```

## Add Login Button

Use the `useAuth()` composable in your Vue components:

```vue
<script setup lang="ts">
const { isLoggedIn, user, login, logout } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoggedIn">
      <p>Welcome, {{ user?.name }}!</p>
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <button @click="login('google')">Login with Google</button>
    </div>
  </div>
</template>
```

## That's It! ✨

You now have a working authentication flow with:
- ✅ OAuth 2.0 login with Google
- ✅ JWT token management
- ✅ Automatic token refresh
- ✅ Secure cookie handling

## Next Steps

Learn more about:
- [Other OAuth providers](/providers/) (Auth0, GitHub, etc.)
- [Route protection](/guides/route-protection)
- [Custom claims](/guides/custom-claims)
- [Advanced configuration](/configuration/)
