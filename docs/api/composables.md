# useAuth()

The `useAuth()` composable provides reactive authentication state and methods for managing user sessions.

## Import

```typescript
import { useAuth } from '#imports'
```

Or use auto-import (recommended):

```vue
<script setup lang="ts">
const { user, isAuthenticated, login, logout } = useAuth()
</script>
```

## Type Signature

```typescript
function useAuth<TUser = User>(): {
  user: Ref<TUser | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
  login: (provider: string, options?: LoginOptions) => Promise<void>
  logout: (options?: LogoutOptions) => Promise<void>
  refresh: () => Promise<void>
}
```

## Return Value

### `user`

**Type:** `Ref<TUser | null>`

Current authenticated user object, or `null` if not authenticated.

```typescript
const { user } = useAuth()

console.log(user.value?.name)   // User's display name
console.log(user.value?.email)  // User's email address
console.log(user.value?.sub)    // Unique user identifier
```

**User Interface:**

```typescript
interface User {
  sub: string          // Unique user ID
  name: string         // Display name
  email: string        // Email address
  picture?: string     // Profile picture URL
  provider: string     // OAuth provider
  iat: number          // Token issued at (Unix timestamp)
  exp: number          // Token expires at (Unix timestamp)
  // ... custom claims
}
```

::: tip Reactive
`user` is reactive and automatically updates when authentication state changes.
:::

### `isAuthenticated`

**Type:** `Ref<boolean>`

Boolean indicating whether the user is currently authenticated.

```vue
<template>
  <div v-if="isAuthenticated">
    <p>Welcome back!</p>
  </div>
  <div v-else>
    <p>Please log in.</p>
  </div>
</template>
```

### `isLoading`

**Type:** `Ref<boolean>`

Boolean indicating whether authentication state is being loaded.

```vue
<template>
  <div v-if="isLoading">
    <LoadingSpinner />
  </div>
  <div v-else-if="isAuthenticated">
    <UserProfile :user="user" />
  </div>
</template>
```

::: warning Always Check Loading
Always check `isLoading` before rendering authentication-dependent content to avoid flashing incorrect UI states.
:::

### `login(provider, options?)`

**Type:** `(provider: string, options?: LoginOptions) => Promise<void>`

Initiates the OAuth login flow for the specified provider.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `string` | ✅ | Provider name (`'google'`, `'auth0'`, `'github'`, `'mock'`) |
| `options` | `LoginOptions` | ❌ | Optional configuration |

**LoginOptions:**

```typescript
interface LoginOptions {
  redirect?: string                         // Custom redirect URL after login
  authorizationParams?: Record<string, string> // Custom OAuth parameters
}
```

**Example:**

```typescript
const { login } = useAuth()

// Basic login
await login('google')

// With custom redirect
await login('google', {
  redirect: '/dashboard'
})

// With authorization parameters
await login('google', {
  authorizationParams: {
    prompt: 'consent',
    access_type: 'offline'
  }
})
```

**Returns:** `Promise<void>`

### `logout(options?)`

**Type:** `(options?: LogoutOptions) => Promise<void>`

Logs out the current user and clears the session.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `LogoutOptions` | ❌ | Optional configuration |

**LogoutOptions:**

```typescript
interface LogoutOptions {
  redirect?: string  // Custom redirect URL after logout
}
```

**Example:**

```typescript
const { logout } = useAuth()

// Basic logout
await logout()

// With custom redirect
await logout({ redirect: '/goodbye' })
```

**Returns:** `Promise<void>`

### `refresh()`

**Type:** `() => Promise<void>`

Manually refreshes the access token using the refresh token cookie.

```typescript
const { refresh } = useAuth()

try {
  await refresh()
  console.log('Token refreshed successfully')
} catch (error) {
  console.error('Refresh failed:', error)
}
```

::: info Automatic Refresh
When `automaticRefresh: true` is configured, tokens are refreshed automatically. Manual refresh is rarely needed.
:::

**Returns:** `Promise<void>`

## Usage Examples

### Basic Authentication

```vue
<script setup lang="ts">
const { user, isAuthenticated, isLoading, login, logout } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoading">
      Loading...
    </div>
    <div v-else-if="isAuthenticated">
      <p>Welcome, {{ user?.name }}!</p>
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <button @click="login('google')">Login with Google</button>
    </div>
  </div>
</template>
```

### Multiple Providers

```vue
<script setup lang="ts">
const { login } = useAuth()

const providers = [
  { name: 'google', label: 'Google' },
  { name: 'github', label: 'GitHub' },
  { name: 'auth0', label: 'Auth0' },
]
</script>

<template>
  <div class="providers">
    <button
      v-for="provider in providers"
      :key="provider.name"
      @click="login(provider.name)"
    >
      Login with {{ provider.label }}
    </button>
  </div>
</template>
```

### Custom Claims Access

```vue
<script setup lang="ts">
interface CustomUser extends User {
  role: 'admin' | 'user'
  premium: boolean
}

const { user } = useAuth<CustomUser>()

const isAdmin = computed(() => user.value?.role === 'admin')
const isPremium = computed(() => user.value?.premium === true)
</script>

<template>
  <div>
    <p>Role: {{ user?.role }}</p>
    <span v-if="isPremium" class="badge">Premium</span>
  </div>
</template>
```

### Error Handling

```vue
<script setup lang="ts">
const { login } = useAuth()
const error = ref<string | null>(null)

async function handleLogin(provider: string) {
  try {
    error.value = null
    await login(provider)
  } catch (err) {
    error.value = 'Login failed. Please try again.'
    console.error(err)
  }
}
</script>

<template>
  <div>
    <button @click="handleLogin('google')">Login</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>
```

## Type Safety

Define custom user types for full type safety:

```typescript
// types/auth.ts
export interface AppUser {
  sub: string
  name: string
  email: string
  picture?: string
  provider: string
  role: 'admin' | 'user' | 'guest'
  permissions: string[]
  organizationId: string
  premium: boolean
}

// Component
const { user } = useAuth<AppUser>()

// Fully typed
const role = user.value?.role           // Type: 'admin' | 'user' | 'guest'
const permissions = user.value?.permissions // Type: string[]
```

## Related

- [Login Guide](/guides/client-auth)
- [Route Protection](/guides/route-protection)
- [Custom Claims](/guides/custom-claims)
