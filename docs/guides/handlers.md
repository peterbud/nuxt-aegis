# Logic Handlers

Handlers allow you to customize the core logic of Nuxt Aegis, such as transforming user data or handling impersonation checks. Unlike hooks, handlers are expected to return data that affects the authentication flow.

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

Called after fetching user information from the OAuth provider, but before storing it in the session/token.

**Use cases:**
- Normalize user data across different providers
- Add custom fields to all user objects (e.g. roles, permissions)
- Enrich user data from external sources (database, API)

**Signature:**
`(payload: UserInfoHookPayload) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void`

**Example:**

```typescript
defineAegisHandler({
  onUserInfo: async (payload) => {
    // Add a custom field to all users
    payload.providerUserInfo.role = 'user'
    payload.providerUserInfo.authenticatedAt = new Date().toISOString()
    
    // Return the modified user object to use it
    return payload.providerUserInfo
  }
})
```

### `impersonation.canImpersonate`

Determines if a user is allowed to impersonate another user.

**Use cases:**
- Restrict impersonation to specific roles (e.g. 'admin', 'support')
- Implement complex permission logic

**Signature:**
`(requester: TokenPayload, targetId: string, event: H3Event) => Promise<boolean> | boolean`

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
