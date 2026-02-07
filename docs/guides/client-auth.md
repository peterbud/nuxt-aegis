# Client-Side Authentication

Learn how to manage authentication state and user sessions in your Vue components.

## The useAuth Composable

The `useAuth()` composable provides reactive authentication state and methods for managing user sessions.

### Basic Usage

```vue
<script setup lang="ts">
const { user, isLoggedIn, login, logout } = useAuth()
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

## Returned Properties

### `user`

Current authenticated user object, or `null` if not authenticated.

```typescript
const { user } = useAuth()

// User object structure
interface User {
  sub: string          // Unique user identifier
  name: string         // Full name
  email: string        // Email address
  picture?: string     // Profile picture URL
  provider: string     // OAuth provider (google, auth0, github)
  // ... custom claims
}
```

::: tip Reactive State
`user` is reactive and automatically updates when authentication state changes.
:::

### `isLoggedIn`

Boolean indicating whether the user is currently logged in.

```vue
<script setup lang="ts">
const { isLoggedIn } = useAuth()
</script>

<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link v-if="isLoggedIn" to="/dashboard">
      Dashboard
    </router-link>
    <router-link v-else to="/login">
      Login
    </router-link>
  </nav>
</template>
```

### `isLoading`

Boolean indicating whether authentication state is being loaded.

```vue
<script setup lang="ts">
const { isLoading, isLoggedIn, user } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoading">
      <p>Loading...</p>
    </div>
    <div v-else-if="isLoggedIn">
      <p>Welcome, {{ user?.name }}!</p>
    </div>
    <div v-else>
      <p>Please log in</p>
    </div>
  </div>
</template>
```

::: tip Loading State
Always check `isLoading` before rendering authentication-dependent content to avoid flashes of incorrect content.
:::

### `error`

Error message from authentication operations, or `null` if no error.

```vue
<script setup lang="ts">
const { error, login } = useAuth()
</script>

<template>
  <div>
    <p v-if="error" class="error">{{ error }}</p>
    <button @click="login('google')">Login</button>
  </div>
</template>
```

### `isImpersonating`

Boolean indicating whether currently impersonating another user.

```vue
<script setup lang="ts">
const { isImpersonating, user, originalUser, stopImpersonation } = useAuth()
</script>

<template>
  <div v-if="isImpersonating" class="banner">
    <p>
      You ({{ originalUser?.originalUserEmail }}) are impersonating {{ user?.email }}
    </p>
    <button @click="stopImpersonation">Stop Impersonation</button>
  </div>
</template>
```

::: tip Impersonation Feature
This property is only available when impersonation is enabled. See [User Impersonation Guide](/guides/impersonation) for details.
:::

### `originalUser`

Original user information when impersonating. Returns `null` when not impersonating.

```typescript
const { originalUser, isImpersonating } = useAuth()

if (isImpersonating.value) {
  console.log('Original user ID:', originalUser.value?.originalUserId)
  console.log('Original user email:', originalUser.value?.originalUserEmail)
  console.log('Original user name:', originalUser.value?.originalUserName)
}
```

**OriginalUser Interface:**

```typescript
interface OriginalUser {
  originalUserId: string      // Original user's ID
  originalUserEmail?: string  // Original user's email
  originalUserName?: string   // Original user's name
}
```

## Authentication Methods

### `login(provider?, redirectTo?)`

Initiates the OAuth login flow for the specified provider.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider name (`'google'`, `'auth0'`, `'github'`, `'mock'`). Defaults to `'google'` |
| `redirectTo` | `string` | Optional redirect path after login (not currently implemented) |

**Example:**

```typescript
const { login } = useAuth()

// Basic login (defaults to Google)
await login()

// Login with specific provider
await login('google')
await login('github')
await login('auth0')
```

### `logout(redirectTo?)`

Logs out the current user and clears the session.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `redirectTo` | `string` | Optional redirect path after logout |

**Example:**

```typescript
const { logout } = useAuth()

// Basic logout
await logout()

// With custom redirect
await logout('/goodbye')
```

### `refresh(options?)`

Manually refreshes the access token using the refresh token. Optionally recomputes custom claims.

```typescript
const { refresh, user } = useAuth()

// Basic refresh
try {
  await refresh()
  console.log('Token refreshed:', user.value)
} catch (error) {
  console.error('Refresh failed:', error)
}

// Refresh with updated claims (after role/permission change)
await refresh({ updateClaims: true })
```

::: tip Automatic Refresh
Tokens are automatically refreshed before expiration when `automaticRefresh: true` is configured. Manual refresh is rarely needed.
:::

### `impersonate(targetUserId, reason?)`

Start impersonating another user. Requires admin privileges.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetUserId` | `string` | Target user ID or email to impersonate |
| `reason` | `string` | Optional reason for impersonation (for audit logs) |

**Example:**

```typescript
const { impersonate } = useAuth()

// Basic impersonation
await impersonate('user-123')

// With reason for audit trail
await impersonate('user@example.com', 'Debugging issue #456')
```

**Behavior:**
- Generates a new short-lived access token (15 minutes default)
- Does NOT generate a refresh token (impersonated sessions cannot be refreshed)
- Updates authentication state to the impersonated user
- Stores original user information for restoration

::: warning Authorization Required
Implement the `nuxt-aegis:impersonate:check` and `nuxt-aegis:impersonate:fetchTarget` hooks. See [User Impersonation Guide](/guides/impersonation).
:::

### `stopImpersonation()`

Stop impersonating and restore the original user session.

**Example:**

```typescript
const { stopImpersonation } = useAuth()

try {
  await stopImpersonation()
  console.log('Restored to original user')
} catch (error) {
  console.error('Failed to stop impersonation:', error)
}
```

**Behavior:**
- Validates current session is impersonated
- Restores original user's session with full privileges
- Generates new access token and refresh token
- Updates authentication state to the original user

## Conditional Rendering

### Show/Hide Based on Authentication

```vue
<script setup lang="ts">
const { isLoggedIn, user } = useAuth()
</script>

<template>
  <div v-if="isLoggedIn">
    <h1>Welcome back, {{ user?.name }}!</h1>
    <p>{{ user?.email }}</p>
  </div>
  <div v-else>
    <h1>Welcome, Guest!</h1>
    <p>Please log in to access your account.</p>
  </div>
</template>
```

### Show During Loading

```vue
<script setup lang="ts">
const { isLoading, isLoggedIn, user, login } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoading">
      <p>Loading...</p>
    </div>
    <div v-else-if="isLoggedIn">
      <img :src="user?.picture" :alt="user?.name" />
      <p>{{ user?.name }}</p>
    </div>
    <div v-else>
      <button @click="login('google')">Login</button>
    </div>
  </div>
</template>
```

## Accessing User Data

### Basic User Properties

```vue
<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <div v-if="user">
    <img :src="user.picture" :alt="user.name" />
    <h2>{{ user.name }}</h2>
    <p>{{ user.email }}</p>
    <span>Provider: {{ user.provider }}</span>
  </div>
</template>
```

### Custom Claims

```vue
<script setup lang="ts">
const { user } = useAuth()

// Access custom claims
const userRole = computed(() => user.value?.role || 'user')
const isPremium = computed(() => user.value?.premium === true)
</script>

<template>
  <div v-if="user">
    <p>Role: {{ userRole }}</p>
    <span v-if="isPremium" class="badge">Premium</span>
  </div>
</template>
```

## Complete Example

```vue
<script setup lang="ts">
const { user, isLoggedIn, isLoading, login, logout } = useAuth()

const providers = [
  { name: 'google', label: 'Google' },
  { name: 'github', label: 'GitHub' },
  { name: 'auth0', label: 'Auth0' },
]
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading">
      <p>Loading...</p>
    </div>
    
    <!-- Authenticated State -->
    <div v-else-if="isLoggedIn">
      <img :src="user?.picture" :alt="user?.name" />
      <h2>{{ user?.name }}</h2>
      <p>{{ user?.email }}</p>
      <p>Provider: {{ user?.provider }}</p>
      <button @click="logout('/')">Logout</button>
    </div>
    
    <!-- Guest State -->
    <div v-else>
      <h2>Welcome!</h2>
      <p>Choose a provider to log in:</p>
      <button
        v-for="provider in providers"
        :key="provider.name"
        @click="login(provider.name)"
      >
        {{ provider.label }}
      </button>
    </div>
  </div>
</template>
```

## TypeScript Support

Define custom user types for better type safety:

```typescript
// types/auth.ts
export type AppTokenClaims = CustomTokenClaims<{
  role: 'admin' | 'user' | 'guest'
  premium: boolean
  customData?: Record<string, any>
}>

// Component
const { user } = useAuth<AppTokenClaims>()

// Now user has full type safety
const role = user.value?.role // Type: 'admin' | 'user' | 'guest'
const isPremium = user.value?.premium // Type: boolean
```

## Next Steps

- [Implement route protection](/guides/route-protection)
- [Add custom claims](/guides/custom-claims)
- [Use authentication hooks](/guides/hooks)
