# useAuth()

The `useAuth()` composable provides reactive authentication state and methods for managing user sessions.

## Import

```typescript
import { useAuth } from '#nuxt-aegis/app'
```

Or use auto-import (recommended):

```vue
<script setup lang="ts">
const { user, isLoggedIn, authStatus, isResolved, login, logout } = useAuth()
</script>
```

## Type Signature

```typescript
function useAuth<T extends BaseTokenClaims = BaseTokenClaims>(): {
  authStatus: ComputedRef<AuthStatus>
  isResolved: ComputedRef<boolean>
  user: ComputedRef<T | null>
  isLoggedIn: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  error: ComputedRef<AuthError | null>
  isImpersonating: ComputedRef<boolean>
  originalUser: ComputedRef<OriginalUser | null>
  login: (provider?: string, redirectTo?: string) => Promise<void>
  logout: (redirectTo?: string) => Promise<void>
  refresh: (options?: { updateClaims?: boolean }) => Promise<void>
  ensureResolved: () => Promise<void>
  impersonate: (targetUserId: string, reason?: string) => Promise<void>
  stopImpersonation: () => Promise<void>
}
```

::: tip Type-Safe Custom Claims
Use the generic parameter to get type-safe access to custom claims. See [Token Types guide](/guides/types/token-types.md) for details.
:::

## Return Value

### `user`

**Type:** `ComputedRef<T | null>`

Current authenticated user object, or `null` if not authenticated.

```typescript
const { user } = useAuth()

console.log(user.value?.name)   // User's display name
console.log(user.value?.email)  // User's email address
console.log(user.value?.sub)    // Unique user identifier
```

**Default User Interface:**

```typescript
interface BaseTokenClaims {
  sub: string          // Unique user ID
  name: string         // Display name
  email: string        // Email address
  picture?: string     // Profile picture URL
  provider: string     // OAuth provider
  iat: number          // Token issued at (Unix timestamp)
  exp: number          // Token expires at (Unix timestamp)
}
```

**With Custom Claims:**

```typescript
import type { CustomTokenClaims } from '#nuxt-aegis/types'

// Define your token type
type AppTokenClaims = CustomTokenClaims<{
  role: 'admin' | 'user'
  permissions: string[]
}>

// Use with type parameter
const { user } = useAuth<AppTokenClaims>()

// Type-safe access to custom claims
if (user.value?.role === 'admin') {
  console.log('Admin permissions:', user.value.permissions)
}
```

::: tip Reactive
`user` is reactive and automatically updates when authentication state changes.
:::

::: tip Type Safety
See [Token Types guide](/guides/types/) for comprehensive examples of type-safe custom claims.
:::

### `authStatus`

**Type:** `ComputedRef<AuthStatus>`

Explicit client-side authentication state.

- `'unknown'`: session not yet verified, including after a recoverable startup failure
- `'authenticated'`: user is authenticated and `user.value` is populated
- `'guest'`: auth has been resolved and no authenticated session is available

```vue
<template>
  <p v-if="isLoading">Checking session...</p>
  <p v-else-if="authStatus === 'unknown'">{{ error?.message || 'Session not checked' }}</p>
  <p v-else-if="authStatus === 'authenticated'">Welcome back!</p>
  <p v-else>Please log in.</p>
</template>
```

### `isResolved`

**Type:** `ComputedRef<boolean>`

Whether status is no longer `unknown`. This remains `false` after a recoverable startup failure, even when loading has finished.

```typescript
const { isResolved, authStatus } = useAuth()

if (isResolved.value && authStatus.value === 'guest') {
  console.log('No active session')
}
```

### `isLoggedIn`

**Type:** `ComputedRef<boolean>`

Boolean indicating whether the user is currently authenticated.

```vue
<template>
  <div v-if="isLoggedIn">
    <p>Welcome back!</p>
  </div>
  <div v-else>
    <p>Please log in.</p>
  </div>
</template>
```

### `isLoading`

**Type:** `ComputedRef<boolean>`

Boolean indicating whether an auth operation is currently in progress, such as refresh, impersonation, or logout.
Resets after success or failure; it does not indicate whether a session is valid.

```vue
<template>
  <div v-if="isLoading">
    <LoadingSpinner />
  </div>
  <div v-else-if="isLoggedIn">
    <UserProfile :user="user" />
  </div>
</template>
```

::: warning Readiness vs Loading
`isLoading` does not mean initial auth is unresolved. Use `isResolved`, `authStatus`, or `await ensureResolved()` when you need a deterministic startup auth decision.
:::

### `error`

**Type:** `ComputedRef<AuthError | null>`

Structured auth failure. Display `error.message` and branch on `error.category`; see [AuthError](/api/types#autherror). A new refresh attempt and successful recovery clear stale errors.

| Refresh outcome | Startup without identity | Established session |
|---|---|---|
| Success | Authenticate | Update user and token |
| 401 | Guest; no public error from `ensureResolved()` | Clear user/token; `session_expired` |
| Network / 5xx | Remain unknown; `network_error` / `server_error` | Preserve identity; expose error |
| 403 | Remain unknown; `forbidden` | Preserve identity; `forbidden` |

Preserved identity does not extend access-token validity or authorize a failed request.

### `ensureResolved()`

**Type:** `() => Promise<void>`

Ensures the initial auth state has been determined. On cold start, this may restore the session using the refresh token cookie. Once auth is already resolved, repeated calls are effectively no-ops.

This method deduplicates concurrent callers, so middleware, layouts, and components can safely await the same in-flight resolution work.

An expected startup 401 resolves quietly to guest. Network, 5xx, and forbidden failures record an error and reject, leaving status unknown. Call again to retry; there is no background retry loop.

```typescript
const { ensureResolved, error } = useAuth()

async function retrySession() {
  try {
    await ensureResolved()
  } catch {
    console.error(error.value?.message)
  }
}
```

### `isImpersonating`

**Type:** `ComputedRef<boolean>`

Boolean indicating whether the current user is impersonating another user.

```vue
<template>
  <div v-if="isImpersonating" class="impersonation-banner">
    <p>You are currently impersonating {{ user?.email }}</p>
    <button @click="stopImpersonation">Stop Impersonation</button>
  </div>
</template>
```

::: tip Impersonation Feature
This property is only available when the impersonation feature is enabled in configuration. See [User Impersonation Guide](/guides/impersonation) for details.
:::

### `originalUser`

**Type:** `ComputedRef<OriginalUser | null>`

Original user information when impersonating. Returns `null` when not impersonating.

```typescript
const { originalUser, isImpersonating } = useAuth()

if (isImpersonating.value) {
  console.log('Original admin:', originalUser.value?.originalUserEmail)
  console.log('Impersonating:', user.value?.email)
}
```

**OriginalUser Interface:**

```typescript
interface OriginalUser {
  originalUserSub: string     // Original user's JWT subject
  originalUserEmail?: string  // Original user's email
  originalUserName?: string   // Original user's name
}
```

### `login(provider?, redirectTo?)`

**Type:** `(provider?: string, redirectTo?: string) => Promise<void>`

Initiates the OAuth login flow for the specified provider.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `string` | ❌ | Provider name (`'google'`, `'auth0'`, `'github'`, `'mock'`). Defaults to `'google'` |
| `redirectTo` | `string` | ❌ | Custom redirect path after login for this request |

**Example:**

```typescript
const { login } = useAuth()

// Basic login (defaults to Google)
await login()

// Login with specific provider
await login('google')
await login('github')
await login('auth0')

// Login with a custom post-login destination
await login('google', '/dashboard?from=auth')
```

**Returns:** `Promise<void>`

### `logout(redirectTo?)`

**Type:** `(redirectTo?: string) => Promise<void>`

Logs out the current user and clears the session.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `redirectTo` | `string` | ❌ | Custom redirect path after logout |

**Example:**

```typescript
const { logout } = useAuth()

// Basic logout
await logout()

// With custom redirect
await logout('/goodbye')
```

**Returns:** `Promise<void>`

### `refresh(options?)`

**Type:** `(options?: { updateClaims?: boolean }) => Promise<void>`

Manually refreshes the access token using the refresh token cookie. Optionally recomputes custom claims before refreshing.
Failures reject with the underlying error and set the structured `error` above. Concurrent callers share one refresh attempt. A preliminary claims-update failure is `operation_error` with `operation: 'update_claims'`; its 401 does not invalidate the refresh session.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `options` | `{ updateClaims?: boolean }` | ❌ | `undefined` | Pass `{ updateClaims: true }` to recompute custom claims before refreshing |

```typescript
const { refresh } = useAuth()

// Basic refresh (reuse existing claims)
try {
  await refresh()
  console.log('Token refreshed successfully')
} catch (error) {
  console.error('Refresh failed:', error)
}

// Refresh with updated claims (after role/permission change)
await refresh({ updateClaims: true })
```

::: info Automatic Refresh
With `automaticRefresh: true`, client API 401s trigger a refresh attempt. Failed attempts are not retried in the background; use `refresh()` for explicit recovery of an established session.
:::

::: tip Updating Claims
Call `refresh({ updateClaims: true })` after changing user data (role, permissions, subscription) in your database. This recomputes custom claims using your global handler's `customClaims` callback, then issues a new JWT.
:::

**How Claims Update Works:**

1. Calls `/auth/update-claims` to recompute custom claims
2. Re-executes global handler's `customClaims` callback
3. Updates stored refresh token data with new claims
4. Calls `/auth/refresh` to get new JWT with updated claims
5. Updates client state with new user data

**Real-World Example:**

```typescript
const { refresh } = useAuth()

async function promoteUserToAdmin(userId: string) {
  // Update user in database
  await $api(`/api/admin/users/${userId}/promote`, { method: 'POST' })
  
  // Refresh with updated claims
  await refresh({ updateClaims: true })
  
  // User now has admin claims in JWT
}
```

::: warning Global Handler Required
Claims update requires `customClaims` to be defined in the global handler (`server/plugins/aegis.ts`). Provider-level custom claims cannot be recomputed at runtime.
:::

**Returns:** `Promise<void>`

**Throws:**

- `401` - Missing or invalid refresh session, or a rejected preliminary claims update
- `403` - Refresh prohibited or claims update disabled
- `5xx` or network failure - Unable to refresh or recompute claims

**Configuration:**

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enableClaimsUpdate: true,        // Default: true
      recomputeOnUserPersist: false,   // Default: false
    },
  },
})
```

**See Also:** [Updating JWT Claims Guide](/guides/updating-claims)

**Returns:** `Promise<void>`

### `impersonate(targetUserId, reason?)`

**Type:** `(targetUserId: string, reason?: string) => Promise<void>`

Start impersonating another user. Requires impersonation to be enabled and proper authorization.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetUserId` | `string` | ✅ | Target user ID or email to impersonate |
| `reason` | `string` | ❌ | Optional reason for impersonation (for audit logs) |

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
- Triggers `nuxt-aegis:impersonate:start` audit hook

**Throws:**

- `403` - Insufficient permissions to impersonate
- `404` - Target user not found or impersonation feature not enabled
- `403` - Already impersonating (cannot chain impersonations)

::: warning Authorization Required
The `nuxt-aegis:impersonate:check` and `nuxt-aegis:impersonate:fetchTarget` hooks must be implemented. See [User Impersonation Guide](/guides/impersonation).
:::

**Returns:** `Promise<void>`

### `stopImpersonation()`

**Type:** `() => Promise<void>`

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
- Attempts to fetch fresh data for the original user
- Falls back to stored original claims if user not found
- Generates new access token with original user's claims
- Generates new refresh token and sets cookie
- Updates authentication state to the original user
- Triggers `nuxt-aegis:impersonate:end` audit hook

**Throws:**

- `400` - Current session is not impersonated

**Returns:** `Promise<void>`

## Usage Examples

### Basic Authentication

```vue
<script setup lang="ts">
const { user, authStatus, isLoading, error, login, logout } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoading">
      Checking session...
    </div>
    <div v-else-if="authStatus === 'unknown'">
      {{ error?.message || 'Session not checked' }}
    </div>
    <div v-else-if="authStatus === 'authenticated'">
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
type AppTokenClaims = CustomTokenClaims<{
  role: 'admin' | 'user'
  premium: boolean
}>

const { user } = useAuth<AppTokenClaims>()

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

### User Impersonation

```vue
<script setup lang="ts">
const { 
  user, 
  isImpersonating, 
  originalUser, 
  impersonate, 
  stopImpersonation 
} = useAuth()

const targetUserId = ref('')
const reason = ref('')
const error = ref<string | null>(null)

async function handleImpersonate() {
  try {
    error.value = null
    await impersonate(targetUserId.value, reason.value || undefined)
    targetUserId.value = ''
    reason.value = ''
  } catch (err) {
    error.value = 'Failed to impersonate user'
    console.error(err)
  }
}

async function handleStopImpersonation() {
  try {
    error.value = null
    await stopImpersonation()
  } catch (err) {
    error.value = 'Failed to stop impersonation'
    console.error(err)
  }
}
</script>

<template>
  <div>
    <!-- Impersonation Banner -->
    <div v-if="isImpersonating" class="impersonation-banner">
      <p>
        You ({{ originalUser?.originalUserEmail }}) are impersonating 
        {{ user?.email }}
      </p>
      <p v-if="user?.impersonation?.reason" class="reason">
        Reason: {{ user.impersonation.reason }}
      </p>
      <button @click="handleStopImpersonation">
        Stop Impersonation
      </button>
    </div>

    <!-- Admin Impersonation Controls -->
    <div v-if="user?.role === 'admin' && !isImpersonating" class="admin-controls">
      <h3>Impersonate User</h3>
      <input 
        v-model="targetUserId" 
        placeholder="User ID or Email"
      />
      <textarea 
        v-model="reason" 
        placeholder="Reason for impersonation (optional)"
      />
      <button @click="handleImpersonate">
        Start Impersonation
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.impersonation-banner {
  background: #fff3cd;
  border: 2px solid #ffc107;
  padding: 1rem;
  margin-bottom: 1rem;
}
</style>
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
  impersonation?: {
    originalUserSub: string
    originalUserLookupId: string
    originalUserEmail?: string
    originalUserName?: string
    impersonatedAt: string
    reason?: string
  }
}

// Component
const { user, isImpersonating } = useAuth<AppUser>()

// Fully typed
const role = user.value?.role           // Type: 'admin' | 'user' | 'guest'
const permissions = user.value?.permissions // Type: string[]

// Check impersonation
if (isImpersonating.value) {
  const originalEmail = user.value?.impersonation?.originalUserEmail
}
```

### Related

- [Login Guide](/guides/client-auth)
- [Route Protection](/guides/route-protection)
- [Custom Claims](/guides/custom-claims)
- [User Impersonation](/guides/impersonation)
