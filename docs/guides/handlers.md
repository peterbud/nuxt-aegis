# Logic Handlers

Handlers allow you to customize the core logic of Nuxt Aegis, such as transforming user data, persisting to a database, generating custom claims, or handling impersonation checks. Unlike hooks, handlers are expected to return data that affects the authentication flow.

## Overview

Handlers are defined using `defineAegisHandler` in a server plugin. This function is auto-imported in your server directory.

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  defineAegisHandler({
    // ... handler configuration
  })
})
```

## Available Handlers

### `onUserInfo`

Called after fetching user information from the OAuth provider, but before persisting to database.

**Use cases:**
- Normalize user data across different providers
- Transform provider-specific fields to common format
- Add metadata (timestamps, provider name, etc.)

**Signature:**
`(payload: UserInfoHookPayload) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined`

**Example:**

```typescript
defineAegisHandler({
  onUserInfo: async (payload) => {
    // Normalize user data
    payload.providerUserInfo.authenticatedAt = new Date().toISOString()
    payload.providerUserInfo.authProvider = payload.provider
    
    // Return the modified user object to use it
    return payload.providerUserInfo
  }
})
```

### `onUserPersist`

**Unified handler for database persistence across all authentication methods (OAuth and password).**

Called after `onUserInfo` transformation. This is where you persist user data to your database and return enriched information to be included in JWT claims.

**Use cases:**
- Create or update user records in your database
- Link OAuth providers to existing accounts
- Update last login timestamps in a database
- Return database-specific fields (internal user ID, role, permissions)

**Signature:**
`(user: Record<string, unknown>, context: { provider: string, event: H3Event }) => Promise<Record<string, unknown>> | Record<string, unknown>`

**Parameters:**
- `user` - User data with provider-specific fields (includes `hashedPassword` for password provider)
- `context.provider` - Provider name (`'google'`, `'github'`, `'password'`, etc.)
- `context.event` - H3Event for server context

**Returns:** Enriched user object with database fields (userId, role, permissions, etc.) that will be merged into the user data.

**Example:**

```typescript
defineAegisHandler({
  onUserPersist: async (user, { provider, event }) => {
    const email = user.email as string
    
    // Handle password authentication
    if (provider === 'password') {
      const hashedPassword = user.hashedPassword as string
      const dbUser = await db.users.upsert({
        where: { email },
        update: { hashedPassword },
        create: { email, hashedPassword, role: 'user' },
      })
      return { userId: dbUser.id, role: dbUser.role, permissions: dbUser.permissions }
    }
    
    // Handle OAuth providers
    const providerId = String(user.id || user.sub)
    let dbUser = await db.users.findByProvider(provider, providerId)
    
    if (dbUser) {
      // Update last login
      await db.users.update(dbUser.id, { lastLogin: new Date() })
    } else {
      // Create or link user
      const existingUser = await db.users.findByEmail(email)
      if (existingUser) {
        await db.users.linkProvider(existingUser.id, provider, providerId)
        dbUser = existingUser
      } else {
        dbUser = await db.users.create({
          email,
          name: user.name,
          picture: user.picture,
          providers: [{ name: provider, id: providerId }],
        })
      }
    }
    
    // Return enriched data for JWT claims
    return {
      userId: dbUser.id,
      role: dbUser.role,
      permissions: dbUser.permissions,
      organizationId: dbUser.organizationId,
    }
  }
})
```

::: tip
The returned object from `onUserPersist` is **merged** into the user data. This means you can selectively add or override fields without replacing the entire object.
:::

### `customClaims`

**Handler-level custom claims generation** (recommended for database-driven claims).

Called after `onUserPersist`, receives the merged user data. This is the recommended location for adding database-driven claims to your JWTs.

**Use cases:**
- Add role and permissions from database to JWT
- Include organization/tenant information
- Add subscription tier or feature flags

**Signature:**
`(user: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>`

**Priority:** Provider-level `customClaims` (defined in route handlers) take precedence over handler-level `customClaims`.

**Example:**

```typescript
defineAegisHandler({
  customClaims: async (user) => {
    return {
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
    }
  }
})
```

::: tip Integration with onUserPersist
The `customClaims` handler receives data from `onUserPersist`. This separation allows you to:
1. Persist data in `onUserPersist` (runs for all auth methods)
2. Transform that data into JWT claims in `customClaims`
:::

### `impersonation.canImpersonate`

Determines if a user is allowed to impersonate another user.

**Use cases:**
- Restrict impersonation to specific roles (e.g. 'admin', 'support')
- Implement complex permission logic

**Signature:**
`(requester: BaseTokenClaims, targetId: string, event: H3Event) => Promise<boolean> | boolean`

**Example:**

```typescript
defineAegisHandler({
  impersonation: {
    canImpersonate: async (requester, targetId, event) => {
      // Only allow admins to impersonate
      return requester.role === 'admin'
    }
  }
})
```

### `impersonation.fetchTarget`

Retrieves the target user's data when starting an impersonation session.

**Use cases:**
- Fetch user details from your database
- Validate that the target user exists
- Enforce organization boundaries (e.g. admin can only impersonate users in their org)

**Signature:**
`(targetId: string, event: H3Event) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null`

**Example:**

```typescript
defineAegisHandler({
  impersonation: {
    fetchTarget: async (targetId, event) => {
      const user = await db.users.findById(targetId)
      if (!user) return null
      
      return {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  }
})
```
