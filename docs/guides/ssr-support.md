# SSR Support

Nuxt Aegis provides full Server-Side Rendering (SSR) support with **authenticated SSR enabled by default** when Nuxt SSR is enabled. The module automatically detects your Nuxt SSR configuration and adjusts accordingly.

## Default Behavior

**When Nuxt SSR is enabled (`ssr: true`):**
- Authenticated SSR is automatically enabled (`enableSSR: true` by default)
- Pages can render with authenticated user data during SSR
- `useAsyncData` and `useFetch` work with authenticated endpoints on the server
- Access tokens are **never** sent to the client in the HTML payload

**When Nuxt SSR is disabled (`ssr: false`):**
- Client-side rendering only
- Token refresh happens after app hydration on the client
- Standard SPA authentication flow

## How Authenticated SSR Works

1. **Server-Side Authentication (During SSR)**
   - Nitro plugin validates the httpOnly refresh cookie
   - Generates a short-lived access token (5 minutes by default)
   - Token is stored in `event.context.ssrAccessToken`
   - `$api` instance automatically includes this token in Authorization headers
   - `event.context.user` is populated for middleware and server routes

2. **Client-Side Hydration (After SSR)**
   - Client calls `/auth/refresh` to get its own long-lived access token (1 hour by default)
   - Refresh token is rotated by the client (not during SSR)
   - Client token is used for all subsequent requests
   - `$api` automatically uses the client token for subsequent calls
   - Authentication state becomes reactive

3. **Security**
   - SSR tokens are never sent to the client (stay in `event.context`)
   - Refresh token is NOT rotated on server (avoids client/server conflicts)
   - Client handles token rotation after hydration

::: tip $api Plugin
The `$api` plugin provides automatic bearer token injection on both server and client. See the [$api Plugin Reference](/api/fetch-plugin) for implementation details and the [Composables API](/api/composables#api) for usage examples.
:::

## Configuration

Authenticated SSR is **enabled by default** when Nuxt SSR is enabled. You can explicitly control this behavior:

```typescript
export default defineNuxtConfig({
  ssr: true, // Nuxt SSR must be enabled
  
  nuxtAegis: {
    // Option 1: Use default (automatic based on Nuxt SSR)
    // enableSSR: undefined (defaults to true when ssr: true)
    
    // Option 2: Explicitly enable authenticated SSR
    enableSSR: true,
    
    // Option 3: Disable authenticated SSR (client-only token refresh)
    // enableSSR: false,
    
    tokenRefresh: {
      automaticRefresh: true, // Recommended
      ssrTokenExpiry: '5m', // SSR token lifetime (default: '5m')
    }
  }
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableSSR` | `boolean` | `true` when `ssr: true` | Enable authenticated SSR mode |
| `tokenRefresh.automaticRefresh` | `boolean` | `true` | Required for SSR experience |
| `tokenRefresh.ssrTokenExpiry` | `string` | `'5m'` | Token lifetime for SSR-generated access tokens |

**Important:** If you set `enableSSR: true` but have `ssr: false` in your Nuxt config, the module will log a warning and SSR authentication will not work.

### Using Authenticated SSR

With authenticated SSR enabled (default), you can fetch authenticated data during SSR:

```vue
<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <h1>Hello, {{ user?.name }}</h1>
      <ul>
        <li v-for="item in data" :key="item.id">
          {{ item.title }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()

// This works on both server and client with authenticated SSR!
const { data, pending, error } = await useAsyncData(
  'user-items',
  () => $api('/api/user/items'),
  {
    server: true, // Enable server-side data fetching
  }
)
</script>
```

### Benefits of Authenticated SSR

✅ **True SSR** - Pages render with user data on server  
✅ **Faster initial render** - No loading states for authenticated data  
✅ **Secure** - Access tokens never in HTML payload  
✅ **Works with all Nuxt patterns** - `useAsyncData`, `useFetch`, `$fetch`

### Performance Considerations

Authenticated SSR adds token validation and generation overhead (~10-50ms per request). The impact is logged in debug mode:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    logging: {
      level: 'debug', // See SSR auth timing logs
    }
  }
})
```

## Best Practices

### 1. Server Routes with Authenticated SSR

With authenticated SSR enabled (default), server routes have access to both `event.context.user` and the `$api` instance with SSR tokens:

```typescript
// server/routes/api/items.get.ts
export default defineEventHandler(async (event) => {
  // Option 1: Use event.context.user (set by SSR plugin or auth middleware)
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  // Option 2: Use $api with SSR token (available during SSR)
  const { $api } = useNuxtApp()
  const items = await $api('/api/external/items') // Works during SSR!
  
  return { user, items }
})
```

**Recommended:** Use `event.context.user` from middleware for most cases. Only use `$api` when you need to call external authenticated endpoints during SSR.

### 2. Client-Side Data Fetching with $api

The `$api` plugin makes it seamless to fetch authenticated data on both server and client. It automatically uses the appropriate token for each context:

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

// $api automatically handles tokens for both SSR and client
// - On server: Uses event.context.ssrAccessToken (5 min lifetime)
// - On client: Uses in-memory access token (1 hour lifetime)
const { data: items, pending, error } = await useAsyncData('dashboard-items', 
  () => $api<Item[]>('/api/items'),
  {
    server: true, // Fetch during SSR with SSR token
  }
)
</script>
```

**How it works:**
- **During SSR:** `$api` uses the short-lived SSR token from `event.context`
- **On client:** `$api` uses the long-lived access token from memory
- **Automatic refresh:** If client token expires, `$api` refreshes and retries automatically

If you want to skip SSR and fetch only on the client:

```typescript
const { data: items, pending, error } = await useAsyncData('dashboard-items', 
  () => $api<Item[]>('/api/items'),
  {
    server: false, // Skip server-side fetching
  }
)
```

::: tip Learn More About $api
See the [$api Plugin Reference](/api/fetch-plugin) for detailed implementation information including:
- How automatic token refresh works
- SSR vs client token differences
- Error handling and retry logic
- Circular reference prevention
:::

### 3. Protected Pages with Authenticated SSR

With authenticated SSR enabled (default), you can render protected content on the server:

```vue
<template>
  <div>
    <h1>Protected Page</h1>
    <div v-if="!user">
      <p>You must be logged in to view this page.</p>
      <NuxtLink to="/auth/google">Log In</NuxtLink>
    </div>
    <div v-else>
      <p>Welcome back, {{ user.name }}!</p>
      <!-- Fetch and display user data during SSR -->
      <div v-if="pending">Loading your data...</div>
      <ul v-else>
        <li v-for="item in items?.data" :key="item.id">
          {{ item.title }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()

// Fetches on server with SSR token AND on client after hydration
const { data: items, pending } = await useAsyncData(
  'protected-items',
  () => $api('/api/protected/items'),
  {
    server: true, // Works with authenticated SSR!
  }
)
</script>
```

### 4. Public Routes

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

### 5. Handling Loading States

Even with authenticated SSR, you may want to show loading states for better UX during client-side navigation:

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

## Security

Nuxt Aegis SSR implementation maintains strong security:

- ✅ **No tokens in HTML**: Access tokens are never exposed in server-rendered HTML
- ✅ **httpOnly cookies**: Refresh tokens remain in secure, httpOnly cookies
- ✅ **In-memory tokens**: Access tokens stored in memory only (cleared on refresh)
- ✅ **HTTPS required**: TLS encryption protects all token exchanges
- ✅ **No XSS exposure**: Tokens not accessible via JavaScript in HTML payload

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

## Disabling SSR or Authenticated SSR

### Disable Nuxt SSR Completely

If your application doesn't need SSR, you can disable it:

```typescript
export default defineNuxtConfig({
  ssr: false, // Disable SSR entirely (SPA mode)
  nuxtAegis: {
    // enableSSR is ignored when ssr: false
  }
})
```

### Disable Only Authenticated SSR

Keep Nuxt SSR enabled but opt out of authenticated SSR (client-only token refresh):

```typescript
export default defineNuxtConfig({
  ssr: true, // Nuxt SSR enabled
  nuxtAegis: {
    enableSSR: false, // Disable authenticated SSR
  }
})
```

With this configuration:
- Pages still render on the server
- Authentication state is restored on the client after hydration
- No SSR access tokens are generated
- `useAsyncData` with `server: true` will not have auth tokens during SSR