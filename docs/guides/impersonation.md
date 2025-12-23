# User Impersonation

User impersonation allows authorized users (typically administrators) to temporarily authenticate as another user for debugging, support, or testing purposes. This feature provides a secure way to troubleshoot user-specific issues while maintaining full audit logging.

## Features

- **Opt-in Configuration**: Disabled by default, must be explicitly enabled
- **Short-lived Sessions**: Impersonated sessions expire quickly (15 minutes default)
- **No Token Refresh**: Impersonated sessions cannot be refreshed for security
- **Audit Logging**: Full audit trail via Nitro hooks
- **Chain Prevention**: Cannot impersonate while already impersonating
- **Custom Authorization**: Implement your own authorization logic via hooks
- **Original Context Access**: Server routes can access both current and original user

## Configuration

Enable impersonation in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  
  nuxtAegis: {
    impersonation: {
      enabled: true,
      tokenExpiration: 900, // 15 minutes in seconds (default)
    },
  },
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable or disable impersonation feature |
| `tokenExpiration` | `number` | `900` | Impersonated token expiration in seconds |

## Required Handlers

To use impersonation, you must implement the `impersonation` handlers using `defineAegisHandler` in a server plugin.

### Implementation Example

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  defineAegisHandler({
    impersonation: {
      // 1. Authorization Check (Optional, defaults to allowing if fetchTarget succeeds)
      canImpersonate: async (requester, targetId, event) => {
        // Check if user is allowed to impersonate
        if (requester.role !== 'admin') {
          return false
        }
        return true
      },

      // 2. Fetch Target User (Required)
      fetchTarget: async (targetUserId, event) => {
        // Fetch the target user from your database
        const targetUser = await getUserById(targetUserId)
        
        if (!targetUser) {
          return null
        }
        
        // Optional: Additional authorization checks
        if (requester.organizationId !== targetUser.organizationId) {
           // You can throw errors for specific messages
           throw createError({
             statusCode: 403,
             message: 'Cannot impersonate users from different organizations',
           })
        }
        
        // Return user data that will become JWT claims
        return {
          sub: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          picture: targetUser.picture,
          role: targetUser.role,
          permissions: targetUser.permissions,
          // ... any other custom claims
        }
      }
    }
  })
})
```

## Optional Audit Hooks

Implement these hooks for audit logging:

### Start Impersonation Hook

```typescript
nitroApp.hooks.hook('nuxt-aegis:impersonate:start', async (payload) => {
  // Log impersonation start
  await auditLog.create({
    action: 'IMPERSONATION_START',
    adminId: payload.requester.sub,
    adminEmail: payload.requester.email,
    targetId: payload.targetUser.sub,
    targetEmail: payload.targetUser.email,
    reason: payload.reason,
    ip: payload.ip,
    userAgent: payload.userAgent,
    timestamp: payload.timestamp,
  })
})
```

### End Impersonation Hook

```typescript
nitroApp.hooks.hook('nuxt-aegis:impersonate:end', async (payload) => {
  // Log impersonation end
  await auditLog.create({
    action: 'IMPERSONATION_END',
    adminId: payload.restoredUser.sub,
    adminEmail: payload.restoredUser.email,
    wasImpersonatingId: payload.impersonatedUser.sub,
    wasImpersonatingEmail: payload.impersonatedUser.email,
    ip: payload.ip,
    userAgent: payload.userAgent,
    timestamp: payload.timestamp,
  })
})
```

## Client-Side Usage

The `useAuth()` composable provides methods and properties for impersonation:

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

async function handleImpersonate() {
  try {
    await impersonate(targetUserId.value, reason.value)
    console.log('Now impersonating:', user.value?.email)
  } catch (error) {
    console.error('Impersonation failed:', error)
  }
}

async function handleStopImpersonation() {
  try {
    await stopImpersonation()
    console.log('Restored to:', user.value?.email)
  } catch (error) {
    console.error('Failed to stop impersonation:', error)
  }
}
</script>

<template>
  <div>
    <!-- Impersonation Banner -->
    <div v-if="isImpersonating" class="banner">
      <p>
        You ({{ originalUser?.originalUserEmail }}) are impersonating 
        {{ user?.email }}
      </p>
      <button @click="handleStopImpersonation">
        Stop Impersonation
      </button>
    </div>
    
    <!-- Admin Controls -->
    <div v-if="user?.role === 'admin' && !isImpersonating">
      <h3>Impersonate User</h3>
      <input v-model="targetUserId" placeholder="User ID or Email" />
      <textarea v-model="reason" placeholder="Reason (optional)" />
      <button @click="handleImpersonate">Start Impersonation</button>
    </div>
  </div>
</template>
```

### Composable API

#### Properties

- **`isImpersonating`**: `ComputedRef<boolean>` - True when currently impersonating
- **`originalUser`**: `ComputedRef<{ originalUserId, originalUserEmail, originalUserName } | null>` - Original user data when impersonating

#### Methods

- **`impersonate(targetUserId: string, reason?: string): Promise<void>`** - Start impersonating another user
- **`stopImpersonation(): Promise<void>`** - End impersonation and restore original session

## Server-Side Usage

Server routes can access both the impersonated user and the original user:

```typescript
// server/routes/api/admin/action.post.ts
export default defineEventHandler(async (event) => {
  const user = event.context.user // Current user (impersonated if active)
  const originalUser = event.context.originalUser // Original user (if impersonating)
  
  if (originalUser) {
    // User is impersonating
    console.log(`Admin ${originalUser.email} is impersonating ${user.email}`)
    
    // You can enforce additional restrictions
    if (someSensitiveAction) {
      throw createError({
        statusCode: 403,
        message: 'This action cannot be performed while impersonating',
      })
    }
  }
  
  // Perform action as current user
  return performAction(user)
})
```

### Context Properties

When impersonating, the middleware injects:

- **`event.context.user`**: Current user (the impersonated user)
- **`event.context.originalUser`**: Original user who started impersonation (if applicable)

```typescript
interface OriginalUserContext {
  sub: string
  email?: string
  name?: string
}
```

## Security Considerations

### Token Characteristics

- **Short Expiration**: Impersonated tokens expire in 15 minutes (configurable)
- **No Refresh**: Impersonated sessions cannot be refreshed - user must re-impersonate
- **Chain Prevention**: Cannot impersonate while already impersonating another user
- **Immediate Validation**: Authorization is checked on every impersonation attempt

### Best Practices

1. **Restrict to Admins**: Implement strict role checks in the `impersonate:check` hook
2. **Require Reasons**: Always prompt for and log the reason for impersonation
3. **Organization Boundaries**: Consider preventing impersonation across organization boundaries
4. **Audit Everything**: Log all impersonation events with full context
5. **Time Limits**: Keep the token expiration short (default 15 minutes)
6. **Sensitive Actions**: Block certain actions when impersonating (e.g., password changes, account deletion)
7. **Notification**: Consider notifying users when they're impersonated (optional)

### Example Authorization Logic

```typescript
nitroApp.hooks.hook('nuxt-aegis:impersonate:check', async (payload) => {
  // 1. Check if user has admin role
  if (payload.requester.role !== 'admin' && payload.requester.role !== 'support') {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions',
    })
  }
  
  // 2. Check if user has specific permission
  if (!payload.requester.permissions?.includes('impersonate')) {
    throw createError({
      statusCode: 403,
      message: 'Missing impersonate permission',
    })
  }
  
  // 3. Rate limiting (optional)
  const recentImpersonations = await getRecentImpersonations(payload.requester.sub)
  if (recentImpersonations.length > 10) {
    throw createError({
      statusCode: 429,
      message: 'Too many impersonation attempts',
    })
  }
  
  // 4. Require reason for audit
  if (!payload.reason) {
    throw createError({
      statusCode: 400,
      message: 'Reason is required for impersonation',
    })
  }
})
```

## JWT Structure

When impersonating, the JWT includes an `impersonation` object:

```json
{
  "sub": "target-user-id",
  "email": "target@example.com",
  "name": "Target User",
  "role": "user",
  "impersonation": {
    "originalUserId": "admin-user-id",
    "originalUserEmail": "admin@example.com",
    "originalUserName": "Admin User",
    "impersonatedAt": "2024-01-15T10:30:00.000Z",
    "reason": "Debugging issue #123",
    "originalClaims": {
      "role": "admin",
      "permissions": ["read", "write", "delete"]
    }
  },
  "iat": 1705315800,
  "exp": 1705316700,
  "iss": "nuxt-aegis"
}
```

The `originalClaims` field stores all custom claims from the original user's token, ensuring they can be fully restored when impersonation ends.

## API Endpoints

### Start Impersonation

```http
POST /auth/impersonate
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "targetUserId": "user-id-or-email",
  "reason": "Debugging user issue #123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGc..."
}
```

### Stop Impersonation

```http
POST /auth/unimpersonate
Authorization: Bearer {impersonated-token}
```

**Response:**

```json
{
  "accessToken": "eyJhbGc..."
}
```

A new refresh token cookie is also set to restore the full session.

## Error Handling

Common error scenarios:

| Status | Error | Description |
|--------|-------|-------------|
| `404` | Feature not enabled | Impersonation is disabled in configuration |
| `403` | Insufficient permissions | User doesn't have permission to impersonate |
| `403` | Cannot chain impersonation | Already impersonating another user |
| `404` | Target user not found | User ID doesn't exist |
| `403` | Organization mismatch | Cannot impersonate users from other organizations |
| `400` | Not impersonating | Tried to stop impersonation when not impersonating |
| `403` | Cannot refresh | Tried to refresh an impersonated session |

## TypeScript Types

```typescript
import type { 
  ImpersonateCheckPayload,
  ImpersonateFetchTargetPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
  ImpersonationContext,
} from 'nuxt-aegis'

// Hook payload types
interface ImpersonateCheckPayload {
  requester: BaseTokenClaims
  targetUserId: string
  reason?: string
  event: H3Event
  ip: string
  userAgent: string
}

interface ImpersonateFetchTargetPayload {
  requester: BaseTokenClaims
  targetUserId: string
  event: H3Event
}

interface ImpersonateStartPayload {
  requester: BaseTokenClaims
  targetUser: BaseTokenClaims
  reason?: string
  event: H3Event
  ip: string
  userAgent: string
  timestamp: Date
}

interface ImpersonateEndPayload {
  restoredUser: BaseTokenClaims
  impersonatedUser: BaseTokenClaims
  event: H3Event
  ip: string
  userAgent: string
  timestamp: Date
}

// Impersonation context in JWT
interface ImpersonationContext {
  originalUserId: string
  originalUserEmail?: string
  originalUserName?: string
  impersonatedAt: string
  reason?: string
  originalClaims?: Record<string, unknown>
}
```

## Complete Example

See the [playground implementation](https://github.com/peterbud/nuxt-aegis/tree/main/playground) for a complete working example with:

- Hook implementations in `server/plugins/aegis.ts`
- UI controls in `app/pages/index.vue`
- Demo API route showing dual context in `server/routes/api/admin/impersonate-demo.get.ts`
