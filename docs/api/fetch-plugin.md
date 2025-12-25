# $api Plugin Reference

The `$api` plugin provides a custom `$fetch` instance with automatic bearer token injection and token refresh handling. This is the **recommended way** to make authenticated API calls in Nuxt Aegis applications.

## Quick Start

Access `$api` from the Nuxt app instance:

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

// Make authenticated API call - bearer token added automatically
const userData = await $api('/api/user/profile')
</script>
```

**Key Features:**
- ✅ Automatic bearer token injection
- ✅ Automatic token refresh on 401 errors
- ✅ Works on both server (SSR) and client
- ✅ Type-safe with TypeScript generics
- ✅ Same API as Nuxt's `$fetch`

## Type Signature

```typescript
$api: typeof $fetch
```

`$api` has the same API as Nuxt's `$fetch`, so you can use all the same options and type parameters:

```typescript
// With TypeScript generics for type safety
interface UserProfile {
  id: string
  name: string
  email: string
}

const profile = await $api<UserProfile>('/api/user/profile')
// profile is typed as UserProfile
```

## How It Works

### Automatic Bearer Token Injection

`$api` automatically attaches the access token to every request:

```typescript
// You write this:
await $api('/api/user/profile')

// $api automatically adds:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**No token available?** If no access token exists, the request proceeds without the `Authorization` header (useful for public endpoints).

### Automatic Token Refresh on 401

When a request returns a 401 Unauthorized response:

1. `$api` automatically calls `/auth/refresh` to get a new access token
2. Retries the original request with the new token
3. If refresh fails, redirects to the configured error page

This happens **transparently** - your code doesn't need to handle token expiration.

```typescript
// Even if token expires mid-request, this will succeed:
const data = await $api('/api/protected/resource')
// $api handles refresh and retry automatically
```

### SSR vs Client Behavior

**Client-Side (Browser):**
- Uses the in-memory access token (1 hour lifetime by default)
- Automatically refreshes on 401 errors
- Retries failed requests once after refresh

**Server-Side (SSR):**
- Uses a short-lived SSR access token (5 minutes by default)
- No retry or refresh logic (tokens are generated fresh per request)
- Token never sent to client (stays in `event.context`)

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

// Works on both server (SSR) and client
const { data } = await useAsyncData('profile', 
  () => $api('/api/user/profile')
)
</script>
```

## Common Patterns

### With useAsyncData

Combine `$api` with `useAsyncData` for reactive server/client data fetching:

```vue
<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">{{ error.message }}</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()

const { data: items, pending, error } = await useAsyncData(
  'user-items',
  () => $api<Item[]>('/api/user/items'),
  {
    server: true, // Fetch during SSR (requires enableSSR: true)
  }
)
</script>
```

### POST Requests

`$api` works with all HTTP methods:

```typescript
const { $api } = useNuxtApp()

// POST with body
const newItem = await $api('/api/items', {
  method: 'POST',
  body: {
    title: 'New Item',
    description: 'Item description'
  }
})

// PUT request
await $api(`/api/items/${id}`, {
  method: 'PUT',
  body: updatedData
})

// DELETE request
await $api(`/api/items/${id}`, {
  method: 'DELETE'
})
```

### Error Handling

Handle errors like any async operation:

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

async function fetchUserData() {
  try {
    const data = await $api('/api/user/profile')
    return data
  } catch (error) {
    console.error('Failed to fetch user data:', error)
    // Handle error (e.g., show notification)
  }
}
</script>
```

### Skip SSR

Fetch only on the client by setting `server: false`:

```typescript
const { data } = await useAsyncData(
  'client-only-data',
  () => $api('/api/user/settings'),
  {
    server: false, // Only fetch on client
  }
)
```

## When to Use $api vs Alternatives

| Scenario | Recommended Approach |
|----------|---------------------|
| Authenticated API calls | ✅ `$api` |
| Public API endpoints | `$fetch` or `$api` (both work) |
| External APIs (non-authenticated) | `$fetch` |
| Implementing auth endpoints | `$fetch` (avoid circular refresh) |
| Server-only authenticated calls | `event.context.user` + `$fetch` |
| Simple data fetching with reactivity | `$api` + `useAsyncData` |
| Advanced fetch configuration | `useFetch` with manual auth |

::: tip Recommended Pattern
For most authenticated API calls, use `$api` with `useAsyncData`:
```typescript
const { data } = await useAsyncData('key', () => $api('/endpoint'))
```
:::

---

## Overview

`$api` is automatically available in all Vue components, composables, and Nuxt contexts via `useNuxtApp().$api`. It wraps Nuxt's `$fetch` with authentication-specific interceptors.

## Implementation Details

### Client-Side Plugin

**Location:** `src/runtime/app/plugins/01.api.client.ts`

The client-side plugin creates a custom `$fetch` instance with the following interceptors:

#### 1. Request Interceptor (Token Injection)

```typescript
onRequest({ options }) {
  const token = getAccessToken()
  
  if (token) {
    options.headers.set('Authorization', `Bearer ${token}`)
  }
}
```

**Behavior:**
- Retrieves access token from **in-memory storage** (not sessionStorage/localStorage)
- Adds `Authorization: Bearer <token>` header to every request
- If no token exists, request proceeds without the header

#### 2. Response Error Interceptor (Auto-Refresh on 401)

```typescript
async onResponseError({ options, response }) {
  if (response.status === 401 && autoRefreshEnabled) {
    const newToken = await attemptTokenRefresh()
    
    if (newToken) {
      options.headers.set('Authorization', `Bearer ${newToken}`)
      return // Retry the request
    }
    
    // Refresh failed, redirect to error page
    clearAccessToken()
    await navigateTo(`${errorUrl}?error=token_refresh_failed&...`)
  }
}
```

**Behavior:**
- Automatically triggered on 401 Unauthorized responses
- Only active when `automaticRefresh: true` (default)
- Prevents multiple simultaneous refresh requests (singleton pattern)
- Retries the original request **once** with new token
- Redirects to configured error page if refresh fails

#### 3. Retry Configuration

```typescript
retry: autoRefreshEnabled ? 1 : 0,
retryStatusCodes: [401],
```

**Behavior:**
- Automatically retries requests that fail with 401
- Only retries **once** after token refresh
- No retry if `automaticRefresh: false`

#### 4. Token Refresh Mechanism

The `attemptTokenRefresh()` function:

```typescript
async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshInProgress) {
    // Wait for existing refresh to complete
    return refreshPromise
  }
  
  refreshInProgress = true
  refreshPromise = (async () => {
    try {
      await $fetch('/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookie
      })
      return getAccessToken()
    } catch (error) {
      console.error('[Aegis] Token refresh failed:', error)
      return null
    } finally {
      refreshInProgress = false
      refreshPromise = null
    }
  })()
  
  return refreshPromise
}
```

**Key Features:**
- **Singleton pattern** - Prevents multiple simultaneous refresh requests
- Uses `$fetch` directly (not `$api`) to avoid circular refresh loops
- Sends httpOnly refresh token cookie automatically
- Returns new access token from memory after successful refresh
- Gracefully handles errors by logging and returning `null`

::: danger Critical Warning: Circular Reference Prevention
**NEVER use `$api` to call the `/auth/refresh` endpoint or any authentication-related endpoints.** Always use `$fetch` directly in these cases to avoid triggering the 401 interceptor, which would cause an infinite refresh loop.

```typescript
// ❌ WRONG - causes infinite loop
await $api('/auth/refresh')

// ✅ CORRECT - use $fetch directly
await $fetch('/auth/refresh')
```

This applies to:
- `/auth/refresh` endpoint
- Custom authentication logic
- Token validation endpoints
- Any endpoint that might return 401 during normal auth flow
:::

#### 5. Automatic Initialization on Mount

When the app mounts, the client plugin attempts automatic token refresh:

```typescript
onNuxtReady(async () => {
  // Skip if on callback page
  if (isCallbackPage()) return
  
  // Skip if on public route
  if (isPublicRoute()) return
  
  // Skip if token already exists
  if (getAccessToken()) return
  
  // Attempt refresh from httpOnly cookie
  await attemptTokenRefresh()
})
```

**Behavior:**
- Runs after Nuxt app hydration completes
- Skips if already authenticated
- Skips on OAuth callback pages
- Skips on configured public routes
- Attempts to restore session from httpOnly refresh cookie

### Server-Side Plugin (SSR)

**Location:** `src/runtime/app/plugins/01.api.server.ts`

The server-side plugin creates a simpler `$fetch` instance for SSR:

```typescript
onRequest({ options }) {
  const event = useRequestEvent()
  const ssrAccessToken = event?.context?.ssrAccessToken
  
  if (ssrAccessToken) {
    options.headers.set('Authorization', `Bearer ${ssrAccessToken}`)
  }
}
```

**Key Differences from Client:**

| Feature | Client Plugin | SSR Plugin |
|---------|--------------|-----------|
| Token source | In-memory access token | `event.context.ssrAccessToken` |
| Token lifetime | 1 hour (default) | 5 minutes (default) |
| Auto-refresh on 401 | ✅ Yes | ❌ No |
| Retry logic | ✅ Yes (1 retry) | ❌ No |
| Initialization | On mount | On each request |
| Token rotation | Via `/auth/refresh` | Generated fresh per request |

**Why simpler?**
- SSR tokens are generated fresh on each server request
- No need for refresh logic (tokens are short-lived and disposable)
- SSR tokens never sent to client (stays in `event.context`)
- Focus on token attachment, not lifecycle management

## Configuration

### Module Options

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      // Enable/disable automatic token refresh on 401
      automaticRefresh: true, // default: true
      
      // SSR token expiration time
      ssrTokenExpiry: '5m', // default: '5m'
    },
    
    // Enable/disable SSR support
    enableSSR: true, // default: true when ssr: true
    
    redirect: {
      // Where to redirect when refresh fails
      error: '/auth-failed', // default: '/'
    },
  }
})
```

### Configuration Impact

**`automaticRefresh: false`:**
- Disables 401 auto-refresh
- Disables retry logic
- User must manually handle token expiration
- Still adds bearer token to requests

**`enableSSR: false`:**
- Disables server-side `$api` plugin
- No SSR token generation
- `$api` only works on client-side
- `useAsyncData` with `server: true` won't have auth tokens

## Token Storage

### Client-Side Storage

Access tokens are stored **in-memory only**:

```typescript
// In src/runtime/app/composables/useAuth.ts
let accessTokenStore: string | null = null

export function getAccessToken(): string | null {
  return accessTokenStore
}

export function setAccessToken(token: string | null): void {
  accessTokenStore = token
}
```

**Security Benefits:**
- ✅ **XSS Protection** - Not accessible via `localStorage`/`sessionStorage`
- ✅ **No Persistence** - Cleared on page refresh
- ✅ **No HTML Exposure** - Never in server-rendered HTML
- ✅ **Memory Only** - Can't be extracted from browser storage

**Trade-offs:**
- ❌ Lost on page refresh (requires automatic refresh from cookie)
- ❌ Not shared across tabs
- ❌ Requires client-side initialization

### Server-Side Storage

SSR tokens are stored in `event.context`:

```typescript
// In server middleware
event.context.ssrAccessToken = generateShortLivedToken(claims, '5m')
```

**Security Benefits:**
- ✅ **Never sent to client** - Stays on server
- ✅ **Short-lived** - 5 minute default expiration
- ✅ **Request-scoped** - Generated per request
- ✅ **No rotation needed** - Disposable tokens

## Error Handling

### Refresh Failure

When token refresh fails, `$api` redirects to the configured error URL:

```typescript
const errorUrl = validateRedirectPath(
  config.public.nuxtAegis.redirect?.error || '/'
)
await navigateTo(
  `${errorUrl}?error=token_refresh_failed&error_description=${encodeURIComponent('Session expired. Please log in again.')}`
)
```

**Query Parameters:**
- `error=token_refresh_failed`
- `error_description=Session expired. Please log in again.`

**Handle in your error page:**

```vue
<!-- pages/auth-failed.vue -->
<script setup lang="ts">
const route = useRoute()
const errorMessage = route.query.error_description || 'Authentication failed'
</script>

<template>
  <div>
    <h1>Authentication Error</h1>
    <p>{{ errorMessage }}</p>
    <button @click="navigateTo('/auth/google')">
      Log In Again
    </button>
  </div>
</template>
```

### Network Errors

Network errors are **not** automatically retried:

```typescript
try {
  const data = await $api('/api/endpoint')
} catch (error) {
  if (error.statusCode === 401) {
    // Already handled by $api
  } else {
    // Handle other errors (network, 500, etc.)
    console.error('Request failed:', error)
  }
}
```

### Timeout

Set custom timeout using standard `$fetch` options:

```typescript
const data = await $api('/api/slow-endpoint', {
  timeout: 10000, // 10 seconds
})
```

## Advanced Usage

### Type Safety with Generics

Define response types for type-safe API calls:

```typescript
interface UserProfile {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

const profile = await $api<UserProfile>('/api/user/profile')
// profile is typed as UserProfile

console.log(profile.role) // TypeScript knows this is 'admin' | 'user'
```

### Custom Headers

Add custom headers alongside the automatic `Authorization` header:

```typescript
const data = await $api('/api/endpoint', {
  headers: {
    'X-Custom-Header': 'value',
    'Content-Type': 'application/json',
  }
})
```

### Request Interceptors

You cannot add additional interceptors to `$api` after creation. For custom interceptor logic, create your own `$fetch` instance:

```typescript
const customFetch = $fetch.create({
  onRequest({ options }) {
    // Custom logic
  },
  async onResponseError({ response }) {
    // Custom error handling
  }
})
```

### Conditional Bearer Token

`$api` always adds the bearer token if available. To skip authentication:

```typescript
// Use $fetch directly for public endpoints
const publicData = await $fetch('/api/public/data')

// Or use $api (works fine, just adds token if available)
const data = await $api('/api/public/data')
```

## Comparison Table

| Feature | `$api` | `$fetch` | `useFetch` | Manual Auth |
|---------|--------|----------|------------|-------------|
| Auto bearer token | ✅ Yes | ❌ No | ❌ No | 👤 Manual |
| Auto refresh on 401 | ✅ Yes | ❌ No | ❌ No | 👤 Manual |
| SSR support | ✅ Yes | ✅ Yes | ✅ Yes | 👤 Manual |
| Type safety | ✅ Generic | ✅ Generic | ✅ Generic | 👤 Manual |
| Reactivity | ❌ No | ❌ No | ✅ Yes | Depends |
| Retry logic | ✅ 401 only | ❌ No | ⚙️ Configurable | 👤 Manual |
| Use in `useAsyncData` | ✅ Recommended | ✅ Yes | N/A | ✅ Yes |
| Best for | Authenticated APIs | Public APIs | Simple data fetching | Custom auth |

### When to Use Each

**Use `$api`:**
- ✅ Authenticated API calls to your backend
- ✅ Protected endpoints requiring bearer tokens
- ✅ When you want automatic token refresh
- ✅ Most common use case

**Use `$fetch`:**
- ✅ Public API endpoints
- ✅ External APIs (non-authenticated)
- ✅ Implementing auth endpoints (avoid circular refresh)
- ✅ When you need full control

**Use `useFetch`:**
- ✅ Simple data fetching with built-in reactivity
- ✅ When you don't need authentication
- ✅ Caching and deduplication needed
- ❌ Less flexible for complex auth scenarios

**Use Manual Authorization:**
- ✅ Custom authentication schemes
- ✅ Non-bearer token auth (API keys, etc.)
- ✅ Special header requirements
- ❌ More boilerplate code

## Debugging

Enable debug logging to see token refresh and `$api` behavior:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    logging: {
      level: 'debug',
    }
  }
})
```

**Console output:**

```
[Aegis] Attempting token refresh...
[Aegis] Token refresh successful
[Aegis] API request: GET /api/user/profile
[Aegis] Request completed: 200 OK
```

## Related

- [useAuth() Composable](/api/composables#useauth)
- [SSR Support Guide](/guides/ssr-support)
- [Token Lifecycle](/architecture/token-lifecycle)
- [Route Protection](/guides/route-protection)
