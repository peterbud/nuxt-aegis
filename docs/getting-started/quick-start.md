# Quick Start

Get your first authentication flow working in minutes.

## Basic Configuration

Add the Nuxt Aegis configuration to your `nuxt.config.ts`, Nuxt will automatically read the environment variables if you set up the name as shown in the [Installation](/getting-started/installation) guide. Otherwise you can use your own env variable naming, but then you need to reference them here.

```typescript
export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  
  nuxtAegis: {
    token: {
      secret: '',
    },
    providers: {
      google: {
        clientId: '',
        clientSecret: '',
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

## Making Authenticated API Calls

Use the `$api` instance to make authenticated requests to your backend:

```vue
<script setup lang="ts">
const { user } = useAuth()
const { $api } = useNuxtApp()

// Fetch user-specific data with automatic bearer token
const { data: items, pending } = await useAsyncData(
  'user-items',
  () => $api('/api/user/items')
)
</script>

<template>
  <div>
    <h1>Welcome, {{ user?.name }}!</h1>
    <div v-if="pending">Loading your items...</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id">
        {{ item.title }}
      </li>
    </ul>
  </div>
</template>
```

The `$api` instance automatically:
- Adds the bearer token to the `Authorization` header
- Refreshes expired tokens and retries failed requests
- Works seamlessly on both server (SSR) and client

::: tip Learn More
See the [$api documentation](/api/composables#api) for advanced usage patterns and configuration.
:::

## Next Steps

Learn more about:
- [Other OAuth providers](/providers/) (Auth0, GitHub, etc.)
- [Route protection](/guides/route-protection)
- [Custom claims](/guides/custom-claims)
- [Advanced configuration](/configuration/)
