# Client-Side Authentication

Learn how to manage authentication state and user sessions in your Vue components.

## The useAuth Composable

The `useAuth()` composable provides reactive authentication state and methods for managing user sessions.

### Basic Usage

```vue
<script setup lang="ts">
const { user, isAuthenticated, login, logout } = useAuth()
</script>

<template>
  <div>
    <div v-if="isAuthenticated">
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

### `isAuthenticated`

Boolean indicating whether the user is currently authenticated.

```vue
<script setup lang="ts">
const { isAuthenticated } = useAuth()
</script>

<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link v-if="isAuthenticated" to="/dashboard">
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
const { isLoading, isAuthenticated, user } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoading">
      <p>Loading...</p>
    </div>
    <div v-else-if="isAuthenticated">
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

## Authentication Methods

### `login(provider, options?)`

Initiates the OAuth login flow for the specified provider.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider name (`'google'`, `'auth0'`, `'github'`, `'mock'`) |
| `options` | `LoginOptions` | Optional configuration |

**LoginOptions:**

```typescript
interface LoginOptions {
  redirect?: string          // Custom redirect URL after login
  authorizationParams?: Record<string, string> // Custom OAuth params
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

// With authorization params
await login('google', {
  authorizationParams: {
    prompt: 'consent',
    access_type: 'offline'
  }
})
```

### `logout(options?)`

Logs out the current user and clears the session.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `LogoutOptions` | Optional configuration |

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

### `refresh()`

Manually refreshes the access token using the refresh token.

```typescript
const { refresh, user } = useAuth()

// Refresh token manually
try {
  await refresh()
  console.log('Token refreshed:', user.value)
} catch (error) {
  console.error('Refresh failed:', error)
}
```

::: tip Automatic Refresh
Tokens are automatically refreshed before expiration when `automaticRefresh: true` is configured. Manual refresh is rarely needed.
:::

## Conditional Rendering

### Show/Hide Based on Authentication

```vue
<template>
  <div>
    <!-- Show only to authenticated users -->
    <div v-if="isAuthenticated">
      <h1>Welcome back, {{ user?.name }}!</h1>
      <p>Email: {{ user?.email }}</p>
    </div>
    
    <!-- Show only to guests -->
    <div v-else>
      <h1>Welcome, Guest!</h1>
      <p>Please log in to access your account.</p>
    </div>
  </div>
</template>
```

### Show During Loading

```vue
<template>
  <div>
    <div v-if="isLoading">
      <!-- Loading skeleton -->
      <div class="skeleton">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-text"></div>
      </div>
    </div>
    
    <div v-else-if="isAuthenticated">
      <!-- Authenticated content -->
      <img :src="user?.picture" alt="Avatar" />
      <p>{{ user?.name }}</p>
    </div>
    
    <div v-else>
      <!-- Guest content -->
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
const { user, isAuthenticated, isLoading, login, logout } = useAuth()

const providers = [
  { name: 'google', label: 'Google', icon: '🔍' },
  { name: 'github', label: 'GitHub', icon: '🐙' },
  { name: 'auth0', label: 'Auth0', icon: '🔐' },
]

function handleLogin(provider: string) {
  login(provider, {
    redirect: '/dashboard',
    authorizationParams: {
      prompt: 'select_account',
    },
  })
}

function handleLogout() {
  logout({ redirect: '/' })
}
</script>

<template>
  <div class="auth-container">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
    
    <!-- Authenticated State -->
    <div v-else-if="isAuthenticated" class="user-profile">
      <img :src="user?.picture" :alt="user?.name" class="avatar" />
      <h2>{{ user?.name }}</h2>
      <p class="email">{{ user?.email }}</p>
      <span class="provider">{{ user?.provider }}</span>
      
      <button @click="handleLogout" class="btn-logout">
        Logout
      </button>
    </div>
    
    <!-- Guest State -->
    <div v-else class="login-options">
      <h2>Welcome!</h2>
      <p>Choose a provider to log in:</p>
      
      <div class="providers">
        <button
          v-for="provider in providers"
          :key="provider.name"
          @click="handleLogin(provider.name)"
          class="btn-provider"
        >
          <span class="icon">{{ provider.icon }}</span>
          <span>{{ provider.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.loading {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.user-profile {
  text-align: center;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 1rem;
}

.email {
  color: #666;
}

.provider {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.btn-logout {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.login-options {
  text-align: center;
}

.providers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.btn-provider:hover {
  border-color: #3498db;
}

.icon {
  font-size: 1.5rem;
}
</style>
```

## TypeScript Support

Define custom user types for better type safety:

```typescript
// types/auth.ts
export interface CustomUser {
  sub: string
  name: string
  email: string
  picture?: string
  provider: string
  role: 'admin' | 'user' | 'guest'
  premium: boolean
  customData?: Record<string, any>
}

// Component
const { user } = useAuth<CustomUser>()

// Now user has full type safety
const role = user.value?.role // Type: 'admin' | 'user' | 'guest'
const isPremium = user.value?.premium // Type: boolean
```

## Next Steps

- [Implement route protection](/guides/route-protection)
- [Add custom claims](/guides/custom-claims)
- [Use authentication hooks](/guides/hooks)
