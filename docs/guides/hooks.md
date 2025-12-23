# Authentication Hooks

Customize authentication behavior globally using Nuxt Aegis hooks in server plugins.

## Overview

Hooks allow you to intercept and react to authentication events. Unlike [Handlers](/guides/handlers), hooks are primarily for side effects (logging, analytics, notifications) and do not affect the core authentication flow logic.

## Available Hooks

### `nuxt-aegis:success`

Called after successful authentication.

**Use cases:**
- Log authentication events
- Send analytics
- Save or update user records in your database
- Trigger notifications or webhooks
- Track login counts

**Payload:**

```typescript
{
  providerUserInfo: Record<string, unknown> // Transformed user object
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string                   // 'google', 'github', 'auth0', etc.
  event: H3Event                     // Server event context
}
```

**Example:**

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async (payload) => {
    console.log('User authenticated:', payload.providerUserInfo.email)
    
    // Update last login timestamp
    await db.users.update(payload.providerUserInfo.id, {
      lastLogin: new Date()
    })
  })
})
```

### `nuxt-aegis:impersonate:start`

Called after an impersonation session has successfully started.

**Use cases:**
- Audit logging (who impersonated whom)
- Security monitoring
- Triggering alerts

**Payload:**

```typescript
{
  requester: BaseTokenClaims    // The admin user
  targetUser: BaseTokenClaims   // The user being impersonated
  reason?: string               // Reason provided for impersonation
  timestamp: Date               // When it started
  ip: string                    // Client IP
  userAgent: string             // Client User Agent
  event: H3Event                // Server event context
}
```

**Example:**

```typescript
nitroApp.hooks.hook('nuxt-aegis:impersonate:start', async (payload) => {
  console.log(`[AUDIT] ${payload.requester.email} started impersonating ${payload.targetUser.email}`)
})
```

### `nuxt-aegis:impersonate:end`

Called after an impersonation session has ended (user reverted to original identity).

**Use cases:**
- Audit logging
- Session duration tracking

**Payload:**

```typescript
{
  restoredUser: BaseTokenClaims     // The admin user (restored)
  impersonatedUser: BaseTokenClaims // The user who was impersonated
  timestamp: Date
  ip: string
  userAgent: string
  event: H3Event
}
```

**Example:**

```typescript
nitroApp.hooks.hook('nuxt-aegis:impersonate:end', async (payload) => {
  console.log(`[AUDIT] Impersonation ended for ${payload.impersonatedUser.email}`)
})
```


**Use cases:**
- Log authentication events
- Save or update user records in your database

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async (payload) => {
    console.log('Login success:', payload.providerUserInfo.email)
  })
})
```
