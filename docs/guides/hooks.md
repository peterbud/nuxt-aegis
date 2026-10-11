# Authentication Hooks

Customize authentication behavior globally using Nuxt Aegis hooks in server plugins.

## Overview

Hooks allow you to intercept and react to authentication events. Unlike [Handlers](/guides/handlers), hooks are primarily for side effects (logging, analytics, notifications) and do not affect the core authentication flow logic.

Import `useServerHooks` from `nuxt/server` to register hooks. Handlers run sequentially in registration order; OAuth's provider-level `onSuccess` runs before the global success hooks. Impersonation audit hook errors do not block impersonation or restoration.

Hook contracts are declared on `NuxtServerHooks` in `@nuxt/schema`. Payload events retain Nuxt's configured server event shape with a Nuxt-owned `RequestEventContext`. Use Aegis handlers for user-info transformation, impersonation authorization, and target lookup; the corresponding hook names are reserved and are not dispatched.

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
  event: SuccessHookPayload['event'] // Nuxt server event context
}
```

**Example:**

```typescript
// server/plugins/aegis.ts
import { useServerHooks } from 'nuxt/server'

export default defineNitroPlugin(() => {
  useServerHooks().hook('nuxt-aegis:success', async (payload) => {
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
  event: ImpersonateStartPayload['event'] // Nuxt server event context
}
```

**Example:**

```typescript
import { useServerHooks } from 'nuxt/server'

useServerHooks().hook('nuxt-aegis:impersonate:start', async (payload) => {
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
  event: ImpersonateEndPayload['event']
}
```

**Example:**

```typescript
import { useServerHooks } from 'nuxt/server'

useServerHooks().hook('nuxt-aegis:impersonate:end', async (payload) => {
  console.log(`[AUDIT] Impersonation ended for ${payload.impersonatedUser.email}`)
})
```


**Use cases:**
- Log authentication events
- Save or update user records in your database

```typescript
// server/plugins/aegis.ts
import { useServerHooks } from 'nuxt/server'

export default defineNitroPlugin(() => {
  useServerHooks().hook('nuxt-aegis:success', async (payload) => {
    console.log('Login success:', payload.providerUserInfo.email)
  })
})
```
