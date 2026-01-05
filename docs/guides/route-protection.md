# Route Protection

Protect your routes from unauthorized access using Nitro route rules and client-side middleware.

## Server-Side Route Protection

The most secure way to protect routes is using server-side middleware configured via Nitro route rules.

### Automatic Route Protection

Configure protected routes using Nitro's `routeRules` in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    // ... provider configuration
  },
  
  nitro: {
    routeRules: {
      // Protect API routes
      '/api/**': { nuxtAegis: { auth: true } },
      '/api/admin/**': { nuxtAegis: { auth: 'required' } },
      
      // Public API routes (override)
      '/api/public/**': { nuxtAegis: { auth: false } },
      '/api/health': { nuxtAegis: { auth: 'skip' } },
    },
  },
})
```

::: tip Authentication Values
The `nuxtAegis.auth` property supports the following values:
- `true` | `'required'` | `'protected'` - Route requires authentication
- `false` | `'public'` | `'skip'` - Route is public and skips authentication
- `undefined` - Route is not protected (opt-in behavior)
:::

::: info Optional Authentication on Public Routes
Even on public routes (where `auth: false`, `'public'`, `'skip'`, or `undefined`), if a valid Bearer token is provided in the `Authorization` header, the middleware will:
1. Verify the token
2. Populate `event.context.user` with the decoded token claims

This enables **optional authentication** - routes that work for both authenticated and anonymous users, with different behavior based on authentication status.

**Example use cases:**
- API endpoints that return personalized data when authenticated
- Public pages with user-specific UI elements when logged in
- Analytics or tracking that includes user identity when available

**Behavior:**
- **Valid token present**: `event.context.user` is populated, no error thrown
- **Invalid token present**: `event.context.user` is undefined, no error thrown (fails silently)
- **No token present**: `event.context.user` is undefined, no error thrown

For protected routes, invalid or missing tokens will throw a 401 error.
:::

::: info Route Matching Precedence
Nitro matches routes by specificity. More specific patterns take precedence:
```typescript
nitro: {
  routeRules: {
    '/api/**': { nuxtAegis: { auth: true } },        // All API routes protected
    '/api/public/**': { nuxtAegis: { auth: false } }, // Except /api/public/*
  }
}
```
:::

### Server Middleware

Use `requireAuth()` in server routes to protect API endpoints:

```typescript
// server/routes/api/profile.get.ts
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event)
  
  // User is guaranteed to be authenticated here
  return {
    profile: {
      name: user.name,
      email: user.email,
    },
  }
})
```

::: danger Authentication Required
`requireAuth()` throws a 401 error if the user is not authenticated. Handle this gracefully on the client side.
:::

### Optional Authentication

Routes without explicit protection (`auth: false`, `'public'`, `'skip'`, or `undefined`) support optional authentication. When a Bearer token is provided, it will be verified and the user context populated, but missing or invalid tokens won't cause errors.

```typescript
// server/routes/api/posts.get.ts
export default defineEventHandler(async (event) => {
  // event.context.user is automatically populated if a valid token is present
  // No error is thrown if missing or invalid - just undefined
  const user = event.context.user
  
  if (user) {
    // Return personalized posts for authenticated users
    return await getPersonalizedPosts(user.sub)
  }
  
  // Return public posts for anonymous users
  return await getPublicPosts()
})
```

Alternatively, use `getAuthUser()` which provides the same behavior explicitly:

```typescript
// server/routes/api/posts.get.ts
export default defineEventHandler(async (event) => {
  // Get user if authenticated (doesn't throw)
  const user = await getAuthUser(event)
  
  if (user) {
    // Return personalized posts
    return await getPersonalizedPosts(user.sub)
  }
  
  // Return public posts
  return await getPublicPosts()
})
```

::: tip Token Verification on Public Routes
The middleware automatically verifies Bearer tokens on public routes and populates `event.context.user` if valid. You don't need to explicitly call `getAuthUser()` unless you prefer the explicit API style.
:::

::: warning Invalid Tokens on Public Routes
On public routes, invalid or expired tokens fail silently - `event.context.user` will be `undefined`. On protected routes, they throw a 401 error.
:::

## Client-Side Route Protection

Protect client-side routes using built-in or custom navigation guards.

::: warning Client-Side Only
Client-side middleware can be bypassed. Always validate authentication on the server for API routes using Nitro routeRules.
:::

### Built-in Middleware

Nuxt Aegis provides two built-in client middlewares: `auth-logged-in` and `auth-logged-out`.

### Configuration Scenarios

#### Scenario A: Manual Per-Page Protection (Recommended)

Most flexible approach with explicit control over which pages are protected.

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    clientMiddleware: {
      enabled: true,
      global: false, // Per-page control (default)
      redirectTo: '/login',
      loggedOutRedirectTo: '/',
      // publicRoutes not needed - middleware only runs where you add it
    },
  },
})
```

Apply middleware to specific pages:

::: code-group

```vue [pages/dashboard.vue - Protected]
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-logged-in'] // Requires authentication
})
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p>This page is protected!</p>
  </div>
</template>
```

```vue [pages/login.vue - Login Page]
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-logged-out'] // Redirects if already logged in
})
</script>

<template>
  <div>
    <h1>Login</h1>
    <!-- Login form -->
  </div>
</template>
```

```vue [pages/index.vue - Public]
<template>
  <div>
    <h1>Welcome</h1>
    <p>No middleware = public page accessible to everyone</p>
  </div>
</template>
```

:::

::: tip Why Per-Page?
- **Explicit**: Clear which pages are protected by looking at `definePageMeta`
- **Flexible**: Easy to add custom middleware chains
- **No configuration overhead**: No need to maintain a `publicRoutes` list
:::

#### Scenario B: Global Protection with Public Routes

Protect all pages by default, except specified public routes.

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    clientMiddleware: {
      enabled: true,
      global: true, // Protect ALL pages by default
      redirectTo: '/login',
      loggedOutRedirectTo: '/',
      publicRoutes: [
        '/', // Home page
        '/about',
        '/contact',
        '/terms',
        // Note: '/login' and '/' are automatically included
      ],
    },
  },
})
```

::: info Automatic Public Routes
When `global: true`, the module **automatically adds** `redirectTo` and `loggedOutRedirectTo` to `publicRoutes` to prevent infinite redirect loops. You don't need to manually include them.
:::

With global protection:

```vue
<!-- pages/dashboard.vue - Protected (no middleware needed) -->
<template>
  <div>
    <h1>Dashboard</h1>
    <p>Protected automatically by global middleware</p>
  </div>
</template>
```

```vue
<!-- pages/login.vue - Still needs auth-logged-out -->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-logged-out'] // Redirect authenticated users
})
</script>

<template>
  <div>
    <h1>Login</h1>
  </div>
</template>
```

::: warning Global Mode Considerations
- You must maintain a `publicRoutes` list as your app grows
- Login/register pages still need `auth-logged-out` middleware
- Public pages (like terms of service) must be explicitly listed
:::

### `auth-logged-in` Middleware

Redirects unauthenticated users to the configured `redirectTo` destination.

**Behavior:**
- When `global: true`: Runs on all routes, checks `publicRoutes` to skip protection
- When `global: false`: Only runs on pages with `definePageMeta({ middleware: ['auth-logged-in'] })`

### `auth-logged-out` Middleware

Redirects authenticated users away from pages that should only be accessible when logged out (e.g., login, register, forgot-password).

**Behavior:**
- Always per-page only (never global)
- Does NOT check `publicRoutes`
- Redirects to `loggedOutRedirectTo` if user is authenticated

**Usage:**

```vue
<!-- pages/login.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-logged-out']
})
</script>
```

```vue
<!-- pages/register.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-logged-out']
})
</script>
```

### Public Routes Pattern Matching

The `publicRoutes` array supports glob patterns:

```typescript
publicRoutes: [
  '/',              // Exact match
  '/about',         // Exact match
  '/blog/*',        // Matches /blog/post-1, /blog/post-2 (single level)
  '/docs/**',       // Matches /docs/guide/intro, /docs/api/config (multi-level)
  '/api/public/*',  // Matches /api/public/status, etc.
]
```

### Configuration Validation

The module validates your configuration at build time:

::: danger Error Conditions
- **`global: true` with empty `publicRoutes`**: Throws an error (even redirect routes need to be accessible)
:::

::: warning Warning Conditions
- **`global: false` with non-empty `publicRoutes`**: Warns that `publicRoutes` will be ignored since middleware is per-page only
:::

### Custom Page-Level Middleware

Create custom middleware for additional logic (e.g., role-based access):

```typescript
// middleware/admin.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { user, isLoggedIn, isLoading } = useAuth()
  
  // Wait for auth to load
  if (isLoading.value) {
    return
  }
  
  // Redirect to login if not authenticated
  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
  
  // Check for admin role
  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
```

Apply to specific pages:

```vue
<!-- pages/admin/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: ['admin'] // Custom middleware with role check
})
</script>
```

### Comparison: Global vs Per-Page

| Aspect | `global: false` (Per-Page) | `global: true` (Global) |
|--------|----------------------------|-------------------------|
| **Default behavior** | Pages are public unless middleware added | All pages protected unless in `publicRoutes` |
| **Configuration** | Simple - no `publicRoutes` needed | Requires maintaining `publicRoutes` list |
| **Clarity** | Explicit - see protection in page code | Implicit - must check config |
| **Maintenance** | Add middleware to new protected pages | Add new public pages to config |
| **Redirect routes** | No special handling needed | Auto-included in `publicRoutes` |
| **Best for** | Most apps, explicit control | Apps with mostly protected pages |

### Custom Global Middleware

If you need custom global protection logic, create your own global middleware instead of using the built-in one:

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn, isLoading } = useAuth()
  
  // Public routes - customize as needed
  const publicRoutes = ['/login', '/register', '/about', '/']
  if (publicRoutes.includes(to.path)) {
    return
  }
  
  // Wait for auth to load
  if (isLoading.value) {
    return
  }
  
  // Protect all other routes
  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
})
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    clientMiddleware: {
      enabled: false, // Disable built-in middleware
    },
  },
})
```

::: tip When to Use Custom Global Middleware
- You need custom logic (e.g., checking subscription status)
- You want different behavior for different route patterns
- You need to integrate with other middleware or plugins
:::

## Role-Based Access Control (RBAC)

Implement role-based protection using custom claims.

### Server-Side RBAC

```typescript
// server/utils/requireRole.ts
export async function requireRole(
  event: H3Event,
  allowedRoles: string[]
) {
  const user = await requireAuth(event)
  
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions'
    })
  }
  
  return user
}
```

Use in API routes:

```typescript
// server/routes/api/admin/users.get.ts
export default defineEventHandler(async (event) => {
  // Only allow admin users
  const user = await requireRole(event, ['admin'])
  
  return await getAllUsers()
})
```

### Client-Side RBAC

```typescript
// middleware/admin.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  if (isLoading.value) return
  
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
  
  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
```

Apply to admin pages:

```vue
<!-- pages/admin/index.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
})
</script>
```

## Permission-Based Access Control

Implement fine-grained permissions:

```typescript
// server/utils/requirePermission.ts
export async function requirePermission(
  event: H3Event,
  permission: string
) {
  const user = await requireAuth(event)
  
  const permissions = user.permissions || []
  
  if (!permissions.includes(permission)) {
    throw createError({
      statusCode: 403,
      message: `Missing permission: ${permission}`
    })
  }
  
  return user
}
```

Use in routes:

```typescript
// server/routes/api/posts/delete.post.ts
export default defineEventHandler(async (event) => {
  // Require 'posts:delete' permission
  const user = await requirePermission(event, 'posts:delete')
  
  const { postId } = await readBody(event)
  return await deletePost(postId)
})
```

## Custom Validation

Create custom validation logic:

```typescript
// server/utils/requirePremium.ts
export async function requirePremium(event: H3Event) {
  const user = await requireAuth(event)
  
  if (!user.premium) {
    throw createError({
      statusCode: 403,
      message: 'Premium subscription required'
    })
  }
  
  return user
}
```

## Conditional UI Elements

Hide UI elements based on roles or permissions:

```vue
<script setup lang="ts">
const { user } = useAuth()

const isAdmin = computed(() => user.value?.role === 'admin')
const isPremium = computed(() => user.value?.premium === true)
const hasPermission = (permission: string) => {
  return user.value?.permissions?.includes(permission)
}
</script>

<template>
  <div>
    <!-- Admin-only button -->
    <button v-if="isAdmin" @click="openAdminPanel">
      Admin Panel
    </button>
    
    <!-- Premium feature -->
    <div v-if="isPremium" class="premium-content">
      <h2>Premium Content</h2>
    </div>
    
    <!-- Permission-based action -->
    <button v-if="hasPermission('posts:delete')" @click="deletePost">
      Delete Post
    </button>
  </div>
</template>
```

## Error Handling

Handle authentication errors gracefully:

```vue
<script setup lang="ts">
async function fetchProtectedData() {
  try {
    const data = await $fetch('/api/protected')
    return data
  } catch (error) {
    if (error.statusCode === 401) {
      // Not authenticated
      await navigateTo('/login')
    } else if (error.statusCode === 403) {
      // Not authorized
      showError('You do not have permission to access this resource')
    }
  }
}
</script>
```

## Testing Protected Routes

Test route protection in your test suite:

```typescript
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('Protected Routes', () => {
  await setup()
  
  it('should require authentication', async () => {
    await expect($fetch('/api/profile')).rejects.toThrow('401')
  })
  
  it('should allow authenticated users', async () => {
    const response = await $fetch('/api/profile', {
      headers: {
        Authorization: 'Bearer valid-token'
      }
    })
    
    expect(response).toBeDefined()
  })
  
  it('should enforce role-based access', async () => {
    await expect($fetch('/api/admin/users', {
      headers: {
        Authorization: 'Bearer user-token' // Not admin
      }
    })).rejects.toThrow('403')
  })
})
```

## Best Practices

::: tip Security Recommendations
1. **Always validate on the server** - Client-side checks can be bypassed
2. **Use `requireAuth()` for API routes** - Throws 401 if not authenticated
3. **Implement RBAC or ABAC** - Use roles or permissions for fine-grained control
4. **Check permissions early** - Validate before expensive operations
5. **Return 403 for authorization failures** - Distinguish from 401 authentication failures
6. **Log security events** - Track failed authorization attempts
7. **Use middleware consistently** - Apply the same rules across similar routes
:::

::: warning Common Pitfalls
- Don't rely solely on client-side middleware
- Don't expose sensitive data in error messages
- Don't check authentication in async components without loading states
- Don't forget to handle token expiration
:::

## Next Steps

- [Implement custom claims](/guides/custom-claims)
- [Use authentication hooks](/guides/hooks)
- [Learn about token refresh](/guides/token-refresh)
