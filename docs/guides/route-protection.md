# Route Protection

Protect your routes from unauthorized access using middleware and server-side validation.

## Server-Side Route Protection

The most secure way to protect routes is using server-side middleware.

### Automatic Route Protection

Configure protected routes in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    routeProtection: {
      protectedRoutes: [
        '/dashboard/**',
        '/admin/**',
        '/api/user/**',
      ],
      publicRoutes: [
        '/login',
        '/about',
        '/api/public/**',
      ],
    },
  },
})
```

::: tip Glob Patterns
Use glob patterns for flexible route matching:
- `/**` matches all routes
- `/dashboard/**` matches all routes under `/dashboard`
- `/api/user/*` matches direct children only
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

Use `getAuthUser()` to optionally check authentication:

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

## Client-Side Route Protection

Protect client-side routes using navigation guards.

### Page-Level Middleware

Create a middleware file:

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  // Wait for auth to load
  if (isLoading.value) {
    return
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
```

Apply to specific pages:

```vue
<!-- pages/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p>This page is protected!</p>
  </div>
</template>
```

### Global Middleware

Create a global middleware:

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  // Public routes
  const publicRoutes = ['/login', '/about', '/']
  if (publicRoutes.includes(to.path)) {
    return
  }
  
  // Wait for auth to load
  if (isLoading.value) {
    return
  }
  
  // Protect all other routes
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
```

::: warning Client-Side Only
Client-side middleware can be bypassed. Always validate authentication on the server for API routes.
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

## Complete RBAC Example

::: code-group

```typescript [server/utils/rbac.ts]
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

```typescript [server/routes/api/admin/users.get.ts]
export default defineEventHandler(async (event) => {
  // Require admin role
  await requireRole(event, ['admin'])
  
  return await getAllUsers()
})
```

```typescript [server/routes/api/posts/create.post.ts]
export default defineEventHandler(async (event) => {
  // Require permission
  const user = await requirePermission(event, 'posts:create')
  
  const body = await readBody(event)
  return await createPost(user.sub, body)
})
```

```typescript [middleware/admin.ts]
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

:::

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
