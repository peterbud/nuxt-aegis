# SSR Support

Nuxt Aegis supports Server-Side Rendering (SSR) with automatic authentication state restoration on the client after hydration.

## How It Works

The SSR implementation follows a secure, client-side token restoration pattern:

1. **Server-Side Rendering**
   - Server renders the page without authentication tokens
   - No tokens are exposed in the HTML payload (secure by design)
   - The `$api` instance is available on the server but doesn't include bearer tokens
   - Server routes should use `event.context.user` from middleware for authentication

2. **Client-Side Hydration**
   - After the page hydrates in the browser, the plugin runs automatically
   - Plugin calls `/auth/refresh` endpoint using the httpOnly refresh cookie
   - Access token is stored in memory and authentication state becomes reactive

3. **User Experience**
   - Authentication state is available ~200-500ms after page load
   - Components can show loading states during token refresh
   - Once authenticated, all `$api` calls include the bearer token

## Configuration

SSR support is **enabled by default**. You can opt-out if needed:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    enableSSR: true, // Default: true
    tokenRefresh: {
      automaticRefresh: true, // Recommended for SSR
    }
  }
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableSSR` | `boolean` | `true` | Enable SSR-compatible authentication state restoration |
| `tokenRefresh.automaticRefresh` | `boolean` | `true` | Required for optimal SSR experience |

## Best Practices

### 1. Handle Loading States

Always account for the brief delay during token refresh after SSR:

```vue
<template>
  <div>
    <p v-if="isLoading">Loading...</p>
    <p v-else-if="user">Hello, {{ user.name }}!</p>
    <p v-else>Please log in</p>
  </div>
</template>

<script setup>
const { user, isLoading } = useAuth()
</script>
```

### 2. Server Routes: Use `event.context.user`, Not `$api`

**❌ DON'T** use `$api` with authentication in server routes:

```typescript
// ❌ Wrong: Server-side $api doesn't include bearer tokens
export default defineEventHandler(async (event) => {
  const data = await useNuxtApp().$api('/api/protected')
  return data
})
```

**✅ DO** use `event.context.user` from middleware:

```typescript
// ✅ Correct: Use event.context.user set by auth middleware
export default defineEventHandler((event) => {
  const user = event.context.user // Set by auth middleware
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  return { data: getUserData(user.sub) }
})
```

The server-side `$api` instance is provided for consistency but **does not include authentication headers**. Authentication in server routes happens via Nitro middleware which populates `event.context.user` after validating bearer tokens.

### 3. Client-Side Data Fetching

When fetching data during SSR that requires authentication, handle the loading state:

```vue
<template>
  <div>
    <h1>Your Dashboard</h1>
    <div v-if="pending">Loading your data...</div>
    <div v-else-if="error">{{ error.message }}</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script setup>
const { $api } = useNuxtApp()

// useAsyncData will call this on server (will fail) and retry on client after token refresh
const { data: items, pending, error } = await useAsyncData('dashboard-items', 
  () => $api<Item[]>('/api/items'),
  {
    // Don't fetch on server - wait for client-side token
    server: false,
  }
)
</script>
```

### 4. Protected Pages with SSR

Protected pages will render during SSR, but authentication state appears after hydration:

```vue
<template>
  <div>
    <h1>Protected Page</h1>
    <div v-if="isLoading">Verifying authentication...</div>
    <div v-else-if="!user">
      <p>You must be logged in to view this page.</p>
      <button @click="login">Log In</button>
    </div>
    <div v-else>
      <p>Welcome back, {{ user.name }}!</p>
      <!-- Protected content here -->
    </div>
  </div>
</template>

<script setup>
const { user, isLoading, login } = useAuth()
</script>
```

### 5. Public Routes

Public routes work seamlessly with SSR - no special handling needed:

```vue
<template>
  <div>
    <h1>Public Page</h1>
    <p>This content is visible to everyone.</p>
    <p v-if="user">Logged in as: {{ user.name }}</p>
  </div>
</template>

<script setup>
const { user } = useAuth()
</script>
```

## Security

Nuxt Aegis SSR implementation maintains strong security:

- ✅ **No tokens in HTML**: Access tokens are never exposed in server-rendered HTML
- ✅ **httpOnly cookies**: Refresh tokens remain in secure, httpOnly cookies
- ✅ **In-memory tokens**: Access tokens stored in memory only (cleared on refresh)
- ✅ **HTTPS required**: TLS encryption protects all token exchanges
- ✅ **No XSS exposure**: Tokens not accessible via JavaScript in HTML payload

This approach is more secure than alternatives that inject tokens into the HTML payload.

## Trade-offs

### Advantages
- 🔒 **Secure**: No token exposure in HTML
- 🚀 **Simple**: Minimal configuration required
- ⚡ **Fast SSR**: No authentication latency during server rendering
- 🔄 **Reactive**: Authentication state updates automatically

### Considerations
- ⏱️ **~200-500ms delay**: Authentication state available after hydration and token refresh
- 📱 **Loading states**: Components should handle loading period gracefully
- 🔄 **Client-side data**: Authenticated API calls happen after hydration

## Disabling SSR

If your application doesn't need SSR, you can disable it:

```typescript
export default defineNuxtConfig({
  ssr: false, // Disable SSR entirely
  nuxtAegis: {
    // enableSSR is ignored when ssr: false
  }
})
```

Or keep SSR enabled but opt-out of authentication state restoration:

```typescript
export default defineNuxtConfig({
  ssr: true,
  nuxtAegis: {
    enableSSR: false, // Skip token refresh after SSR
  }
})
```