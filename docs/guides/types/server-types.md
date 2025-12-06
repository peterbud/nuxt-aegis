# Server Types

Type-safe server-side authentication with Nuxt Aegis.

## `getAuthUser<T>()`

Use generic type parameter for type-safe access to JWT claims:

```typescript
import type { AppTokenPayload } from '~/types/token'

export default defineEventHandler((event) => {
  const user = getAuthUser<AppTokenPayload>(event)
  
  // Fully typed access
  return {
    userId: user.sub,
    role: user.role,              // Custom claim - typed!
    permissions: user.permissions  // string[] - typed!
  }
})
```

## Protected Routes

```typescript
// server/api/admin/users.get.ts
import type { AppTokenPayload } from '~/types/token'

export default defineEventHandler((event) => {
  const user = getAuthUser<AppTokenPayload>(event)
  
  // Type-safe role check
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }
  
  return { users: [] }
})
```

## Custom Claims in Handlers

```typescript
// server/plugins/aegis.ts
import type { AppTokenPayload } from '~/types/token'

export default defineNitroPlugin(() => {
  defineAegisHandler({
    impersonation: {
      async fetchTarget(targetId) {
        const dbUser = await database.findById(targetId)
        
        if (!dbUser) return null
        
        // Return JWT claims (AppTokenPayload structure)
        return {
          sub: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          picture: dbUser.picture,
          role: dbUser.role,
          permissions: dbUser.permissions,
          organizationId: dbUser.organizationId,
          // Note: No hashedPassword or other sensitive fields
        }
      }
    }
  })
})
```

## `requireAuth<T>()`

Alternative that throws if not authenticated:

```typescript
import type { AppTokenPayload } from '~/types/token'

export default defineEventHandler((event) => {
  const authedEvent = requireAuth<AppTokenPayload>(event)
  
  // TypeScript knows user is defined
  return {
    role: authedEvent.context.user.role
  }
})
```

## Type-Safe Middleware

```typescript
// server/middleware/admin.ts
import type { AppTokenPayload } from '~/types/token'

export default defineEventHandler((event) => {
  const user = getAuthUser<AppTokenPayload>(event)
  
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden'
    })
  }
})
```

## Complete Example

```typescript
// server/api/projects/[id].get.ts
import type { AppTokenPayload } from '~/types/token'
import type { DatabaseUser } from '~/types/database'

export default defineEventHandler(async (event) => {
  // 1. Get JWT claims (type-safe)
  const tokenUser = getAuthUser<AppTokenPayload>(event)
  
  // 2. Fetch from database
  const dbUser: DatabaseUser = await database.findById(tokenUser.sub)
  
  // 3. Check permissions
  if (!tokenUser.permissions.includes('projects:read')) {
    throw createError({ statusCode: 403 })
  }
  
  // 4. Fetch project
  const projectId = getRouterParam(event, 'id')
  const project = await database.getProject(projectId)
  
  // 5. Authorize access
  if (project.organizationId !== tokenUser.organizationId) {
    throw createError({ statusCode: 404 })
  }
  
  return project
})
```

## Best Practices

### ✓ Do

```typescript
// Use AppTokenPayload for JWT claims
const user = getAuthUser<AppTokenPayload>(event)

// Fetch database record separately if needed
const dbUser = await database.findById(user.sub)
```

### ✗ Don't

```typescript
// DON'T use DatabaseUser as JWT type
const user = getAuthUser<DatabaseUser>(event)  // ✗ Wrong!

// DatabaseUser has fields not in JWT
// This will cause type mismatches
```

## Next Steps

- [Token Types](./token-types.md) - Define custom payloads
- [Database Types](./database-types.md) - Separate models
- [API Reference](../../api/types.md) - Complete docs
