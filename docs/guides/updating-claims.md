# Updating JWT Claims

Update JWT claims when user data changes without requiring logout/re-login.

## Overview

When user data changes (role, permissions, subscription status, etc.), you may need to update the JWT claims to reflect the current state. Nuxt Aegis supports this via `refresh({ updateClaims: true })`, which recomputes claims using your global handler's `customClaims` callback before issuing a new JWT.

## The Problem

By design, `refresh()` reuses custom claims that were stored during initial authentication:

- ✅ **Fast refresh** - No database queries needed
- ✅ **Consistent claims** - Claims don't change unexpectedly- ❌ **Stale data** - Claims don't update when user data changes

If a user's role, permissions, or other claim data changes in your database, calling `refresh()` will **not** pick up these changes automatically.

## The Solution: `refresh({ updateClaims: true })`

Nuxt Aegis supports recomputing claims as part of the refresh flow:

```vue
<script setup lang="ts">
const { refresh, user } = useAuth()

async function promoteToAdmin() {
  // Update user in database
  await $api('/api/admin/promote-user', {
    method: 'POST',
    body: { userId: user.value?.sub }
  })
  
  // Refresh with updated claims
  await refresh({ updateClaims: true })
  
  // user.value.role is now 'admin'!
}
</script>

<template>
  <div>
    <p>Current role: {{ user?.role }}</p>
    <button @click="promoteToAdmin">Promote to Admin</button>
  </div>
</template>
```

## How It Works

When you call `refresh({ updateClaims: true })`:

1. **Recompute claims** - Calls `/auth/update-claims` endpoint
2. **Re-executes handler** - Runs your global handler's `customClaims` callback
3. **Updates storage** - Stores new claims in refresh token data
4. **Refresh** - Calls `/auth/refresh` to get new JWT with updated claims
5. **Updates state** - Client state updates with new user data

```mermaid
sequenceDiagram
    participant App as Client App
    participant Composable as useAuth()
    participant UpdateClaims as /auth/update-claims
    participant Handler as Global Handler
    participant Storage as Refresh Token Store
    participant Refresh as /auth/refresh

    App->>Composable: refresh({ updateClaims: true })
    Composable->>UpdateClaims: POST /auth/update-claims
    UpdateClaims->>Storage: Get stored user data
    Storage-->>UpdateClaims: Return user info
    UpdateClaims->>Handler: Execute customClaims(user)
    Handler-->>UpdateClaims: Return new claims
    UpdateClaims->>Storage: Update stored claims
    Storage-->>UpdateClaims: Success
    UpdateClaims-->>Composable: Claims updated
    Composable->>Refresh: POST /auth/refresh
    Refresh-->>Composable: New JWT with updated claims
    Composable->>App: user.value updated
```

## Configuration

### Enable/Disable Feature

Claims update is enabled by default but can be disabled:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enableClaimsUpdate: true, // Default: true
    },
  },
})
```

### Recompute User Data

Optionally re-execute `onUserPersist` to fetch fresh database data:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enableClaimsUpdate: true,
      recomputeOnUserPersist: true, // Default: false
    },
  },
})
```

::: info Performance Consideration
When `recomputeOnUserPersist: true`, the `onUserPersist` hook runs on every claims update call, which may query your database. For better performance, keep this `false` (default) unless you need fresh DB data merged into your user object.
:::

## Usage Examples

### Basic Usage

```typescript
const { refresh, user } = useAuth()

// Refresh with updated claims
await refresh({ updateClaims: true })

console.log('Updated role:', user.value?.role)
```

### Without Claims Update

Default `refresh()` reuses cached claims:

```typescript
const { refresh } = useAuth()

// Standard refresh (no claims recomputation)
await refresh()
```

### Handle Errors

```typescript
const { refresh, user } = useAuth()

try {
  await refresh({ updateClaims: true })
  console.log('Claims updated successfully')
} catch (error) {
  console.error('Failed to update claims:', error)
  // Handle error - maybe retry or show user message
}
```

### After Database Update

```vue
<script setup lang="ts">
const { refresh, user } = useAuth()

async function upgradeSubscription() {
  try {
    // Update subscription in database
    await $api('/api/subscription/upgrade', {
      method: 'POST',
      body: { tier: 'premium' }
    })
    
    // Refresh with updated claims
    await refresh({ updateClaims: true })
    
    // User now has premium claims
    if (user.value?.subscription === 'premium') {
      navigateTo('/premium/dashboard')
    }
  } catch (error) {
    console.error('Upgrade failed:', error)
  }
}
</script>
```

## Global Handler Setup

For `refresh({ updateClaims: true })` to work, define your custom claims in the **global handler** (not in individual provider route handlers):

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin(() => {
  defineAegisHandler({
    // Fetch fresh user data from database
    onUserPersist: async (user, { provider }) => {
      const dbUser = await db.users.findByEmail(user.email)
      
      return {
        userId: dbUser.id,
        role: dbUser.role,
        permissions: dbUser.permissions,
        organizationId: dbUser.organizationId,
      }
    },

    // Generate claims from user data
    customClaims: async (user) => {
      return {
        role: user.role,
        permissions: user.permissions,
        organizationId: user.organizationId,
        subscription: user.subscription,
      }
    },
  })
})
```

::: warning Provider-Level Claims Not Supported
Claims defined in individual provider route handlers (e.g., `server/routes/auth/google.get.ts`) cannot be re-executed at runtime. Only the global handler's `customClaims` callback can be recomputed.

Move your dynamic custom claims logic to the global handler in `server/plugins/aegis.ts`.
:::

## Advanced: Custom Update Endpoint

For advanced use cases, create your own update endpoint using the exported utilities:

```typescript
// server/api/admin/update-user-claims.post.ts
import { defineEventHandler } from 'h3'
import { requireAuth, recomputeCustomClaims, hashRefreshToken, getRefreshTokenData, storeRefreshTokenData } from '#nuxt-aegis-server'

export default defineEventHandler(async (event) => {
  // Require admin access
  const authedEvent = requireAuth(event)
  if (authedEvent.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Get target user's refresh token
  const { userId } = await readBody(event)
  const refreshToken = await getRefreshTokenForUser(userId)
  
  if (!refreshToken) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Recompute claims
  const hashedToken = hashRefreshToken(refreshToken)
  const storedData = await getRefreshTokenData(hashedToken, event)
  const newClaims = await recomputeCustomClaims(storedData, event)
  
  // Update storage
  await storeRefreshTokenData(hashedToken, {
    ...storedData,
    customClaims: newClaims,
  }, event)

  return { success: true }
})
```

## When to Update Claims

Trigger `refresh({ updateClaims: true })` when:

- ✅ User role changes (admin promotion/demotion)
- ✅ Permissions are granted or revoked
- ✅ Subscription status changes
- ✅ Organization membership changes
- ✅ Any claim-related user data changes

**Don't update for:**

- ❌ Profile updates that aren't in claims (name, avatar, bio)
- ❌ User preferences or settings
- ❌ Real-time data that changes frequently

## Best Practices

::: tip Keep Claims Small
Claims are included in every request. Only store essential data in claims and fetch detailed data from your API when needed.
:::

::: tip Real-time vs Claims
Don't rely on claims for real-time data. Claims are cached in the JWT until manually updated. For real-time data, query your API directly.
:::

::: warning Security Implications
When claims like `role` or `permissions` change, ensure users cannot exploit the delay between database update and `refresh({ updateClaims: true })` call. Consider:
- Validating permissions on server-side for sensitive operations
- Calling `refresh({ updateClaims: true })` in the same transaction as the database update
- Using short JWT expiration times for high-security applications
:::

::: info Alternative: Shorter Expiration
If claims change frequently, consider:
- Shorter JWT expiration (e.g., 5-15 minutes instead of 1 hour)
- Shorter refresh token rotation
- This forces more frequent claim recomputation if `recomputeOnUserPersist: true`
:::

## API Reference

### `refresh(options?: { updateClaims?: boolean })`

Refresh the access token, optionally recomputing custom JWT claims.

**Parameters:**
- `options.updateClaims` (boolean, optional) - Whether to recompute custom claims before refreshing. Default: `false`

**Returns:** `Promise<void>`

**Throws:**
- Error if refresh fails
- Error if claims update fails (when `updateClaims: true`)
- Error if claims update feature is disabled
- Error if no refresh token found

**Example:**

```typescript
const { refresh } = useAuth()

// Standard refresh (cached claims)
await refresh()

// Refresh with updated claims
await refresh({ updateClaims: true })
```

## Troubleshooting

### Claims Not Updating

**Problem:** Claims stay the same after calling `refresh({ updateClaims: true })`

**Solutions:**
- Ensure you're defining `customClaims` in the **global handler** (`server/plugins/aegis.ts`), not in provider route handlers
- Verify `tokenRefresh.enableClaimsUpdate` is `true` (default)
- Check that `customClaims` callback returns the updated data
- Verify database changes are committed before calling `refresh({ updateClaims: true })`
- Enable `recomputeOnUserPersist: true` if you need fresh DB data

### Feature Disabled Error

**Problem:** `403 Forbidden: Claims update feature is disabled`

**Solution:** Enable the feature in your config:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enableClaimsUpdate: true,
    },
  },
})
```

### No Global Handler

**Problem:** Claims return to old values after update

**Solution:** Register a global handler in `server/plugins/aegis.ts`:

```typescript
export default defineNitroPlugin(() => {
  defineAegisHandler({
    customClaims: async (user) => {
      // Your claims logic here
      return { role: user.role }
    },
  })
})
```

## Next Steps

- [Understand token refresh](/guides/token-refresh)
- [Learn about custom claims](/guides/custom-claims)
- [Set up global handlers](/guides/handlers)
- [Implement route protection](/guides/route-protection)

  const authedEvent = requireAuth(event)
  const userId = authedEvent.context.user.sub

  // Get the refresh token from cookie
  const config = useRuntimeConfig(event)
  const cookieName = config.nuxtAegis?.tokenRefresh?.cookie?.cookieName || 'nuxt-aegis-refresh'
  const refreshToken = getCookie(event, cookieName)

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      message: 'No refresh token found',
    })
  }

  // Hash the token
  const hashedToken = hashRefreshToken(refreshToken)

  // Get existing refresh token data
  const existingData = await getRefreshTokenData(hashedToken, event)

  if (!existingData || existingData.sub !== userId) {
    throw createError({
      statusCode: 403,
      message: 'Invalid refresh token',
    })
  }

  // Fetch fresh user data and compute new claims
  // This is YOUR application logic
  const userRole = await db.getUserRole(userId)
  const permissions = await db.getUserPermissions(userId)

  const newCustomClaims = {
    role: userRole,
    permissions: permissions,
    // ... other claims
  }

  // Update stored refresh token data with new claims
  await storeRefreshTokenData(hashedToken, {
    ...existingData,
    customClaims: newCustomClaims,
  }, event)

  return {
    success: true,
    message: 'Claims updated successfully',
  }
})
```

Then call this endpoint before refreshing:

```typescript
const { refresh } = useAuth()

// Update stored claims
await $api('/api/auth/update-claims', { method: 'POST' })

// Now refresh to get a new JWT with updated claims
await refresh()

// user.value now has the updated claims!
```

**Pros:**
- No re-authentication needed
- Seamless user experience
- Claims update immediately

**Cons:**
- Requires custom endpoint
- Must manually trigger update
- Need access to nuxt-aegis internals

### Option 3: Re-authenticate Silent Flow (OAuth 2.0)

Some OAuth providers support silent re-authentication. This would require extending nuxt-aegis with a silent refresh flow that goes through the OAuth provider again but without user interaction (if they still have an active session with the provider).

This is **not currently implemented** in nuxt-aegis but could be added as a feature request.

## When to Update Claims

Trigger claim updates when:
- User role changes (admin promotion/demotion)
- Permissions change
- Subscription status changes
- User profile data changes that's included in claims

## Best Practices

::: warning Keep Claims Small
Claims are included in every request. Only store essential data in claims and fetch detailed data from your API when needed.
## Next Steps

- [Understand token refresh](/guides/token-refresh)
- [Learn about custom claims](/guides/custom-claims)
- [Set up global handlers](/guides/handlers)
- [Implement route protection](/guides/route-protection)
