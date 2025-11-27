# Authentication Hooks

Customize authentication behavior globally using Nuxt Aegis hooks in server plugins.

## Overview

Hooks allow you to intercept and modify the authentication flow at key points:

- **`nuxt-aegis:userInfo`** - Transform user data after fetching from OAuth provider
- **`nuxt-aegis:success`** - Handle successful authentication events

::: tip Global Configuration
Hooks are defined in server plugins and apply to ALL providers unless overridden at the provider level.
:::

## Available Hooks

### `nuxt-aegis:userInfo`

Called after fetching user information from the OAuth provider, before storing it.

**Use cases:**
- Normalize user data across different providers
- Add custom fields to all user objects
- Enrich user data from external sources (database, API)
- Transform provider-specific formats to a common schema

**Payload:**

```typescript
{
  user: Record<string, unknown>      // Raw user from OAuth provider
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
  user: Record<string, unknown>      // Transformed user object (after userInfo hook)
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

## Defining Global Hooks

Create a server plugin to define hooks that apply to all providers:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  // Transform user data globally
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload) => {
    console.log('User authenticated via', payload.provider)
    
    // Add custom fields to all users
    payload.user.authenticatedAt = new Date().toISOString()
    payload.user.authProvider = payload.provider
    
    // Normalize user ID across providers
    if (!payload.user.id && payload.user.sub) {
      payload.user.id = payload.user.sub
    }
    
    // Return the modified user object
    return payload.user
  })

  // Handle successful authentication globally
  nitroApp.hooks.hook('nuxt-aegis:success', async (payload) => {
    console.log('User authenticated:', payload.user.id)
    
    // Save to database
    await db.users.upsert({
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name,
      provider: payload.provider,
      lastLogin: new Date(),
    })
    
    // Send analytics
    await analytics.track('user_authenticated', {
      userId: payload.user.id,
      provider: payload.provider,
    })
  })
})
```

## Common Use Cases

### Database Synchronization

Automatically create or update user records:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async ({ user, provider }) => {
    // Upsert user in database
    await db.users.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        picture: user.picture,
        lastLogin: new Date(),
      },
      create: {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider,
        createdAt: new Date(),
      },
    })
  })
})
```

### Data Normalization

Normalize user data across different OAuth providers:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload) => {
    const { user, provider } = payload
    
    // Normalize profile picture URL
    if (provider === 'github' && user.avatar_url) {
      user.picture = user.avatar_url
      delete user.avatar_url
    }
    
    // Normalize username/login field
    if (provider === 'github' && user.login) {
      user.username = user.login
    }
    
    // Ensure consistent email field
    if (provider === 'github' && !user.email) {
      // GitHub might not provide email
      const emails = await fetchGitHubEmails(payload.tokens.access_token)
      user.email = emails.find(e => e.primary)?.email
    }
    
    return user
  })
})
```

### Analytics & Logging

Track authentication events:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async ({ user, provider, event }) => {
    // Log to console
    console.log(`[AUTH] User ${user.email} logged in via ${provider}`)
    
    // Send to analytics service
    await analytics.track({
      event: 'user_login',
      userId: user.sub,
      properties: {
        provider,
        timestamp: new Date().toISOString(),
        ip: event.node.req.headers['x-forwarded-for'] || event.node.req.socket.remoteAddress,
        userAgent: event.node.req.headers['user-agent'],
      },
    })
    
    // Log to external service
    await logService.info('User authenticated', {
      userId: user.sub,
      email: user.email,
      provider,
    })
  })
})
```

### User Enrichment

Enrich user data from external sources:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload) => {
    const { user } = payload
    
    // Fetch additional user data from your API
    const extraData = await $fetch(`https://api.myapp.com/users/${user.email}`)
    
    // Add to user object
    user.organization = extraData.organization
    user.role = extraData.role
    user.department = extraData.department
    user.customerId = extraData.customerId
    
    return user
  })
})
```

### Email Verification

Enforce email verification:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload) => {
    const { user } = payload
    
    // Check if email is verified
    if (!user.email_verified) {
      throw createError({
        statusCode: 403,
        message: 'Email not verified. Please verify your email before logging in.',
      })
    }
    
    return user
  })
})
```

### Webhooks

Trigger webhooks on authentication:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async ({ user, provider }) => {
    // Trigger webhook
    await $fetch('https://hooks.example.com/user-authenticated', {
      method: 'POST',
      body: {
        userId: user.sub,
        email: user.email,
        provider,
        timestamp: new Date().toISOString(),
      },
      headers: {
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET,
      },
    })
  })
})
```

## Provider-Level Overrides

Individual OAuth handlers can override global hooks:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
  },
  
  // Override global nuxt-aegis:userInfo hook for Google only
  onUserInfo: async (user, tokens, event) => {
    // Google-specific user transformation
    user.customGoogleField = 'value'
    return user
  },
  
  // Runs BEFORE the global nuxt-aegis:success hook
  onSuccess: async ({ user, provider }) => {
    // Google-specific success logic
    console.log('Google login successful:', user.email)
  },
})
```

## Hook Execution Order

### UserInfo Transformation

1. If provider-level `onUserInfo` is defined → **use it** (global hook is **skipped**)
2. Otherwise → **call global** `nuxt-aegis:userInfo` hook

### Success Handling

1. If provider-level `onSuccess` is defined → **run it first**
2. Then → **always run global** `nuxt-aegis:success` hook

::: tip Hook Priority
Provider-level `onUserInfo` completely replaces the global hook, while provider-level `onSuccess` runs before the global hook.
:::

## Error Handling

Handle errors in hooks gracefully:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async ({ user, provider }) => {
    try {
      await db.users.upsert({
        // ... database operation
      })
    } catch (error) {
      // Log error but don't block authentication
      console.error('Failed to save user to database:', error)
      
      // Optionally send to error tracking service
      await errorTracker.captureException(error, {
        context: 'authentication',
        userId: user.sub,
        provider,
      })
    }
  })
})
```

::: warning Non-Blocking Errors
Errors in the `nuxt-aegis:success` hook do not prevent authentication from succeeding. The user will still receive a valid token even if the hook fails.
:::

## TypeScript Support

Define typed hook payloads:

```typescript
// types/hooks.ts
export interface UserInfoPayload {
  user: Record<string, unknown>
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string
  event: H3Event
}

export interface SuccessPayload {
  user: Record<string, unknown>
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string
  event: H3Event
}

// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload: UserInfoPayload) => {
    // Fully typed payload
    return payload.user
  })
})
```

## Best Practices

::: tip Recommendations
1. **Keep hooks fast** - Avoid slow operations that delay authentication
2. **Handle errors gracefully** - Don't block authentication on non-critical failures
3. **Use async/await** - Hooks support async operations
4. **Log important events** - Track authentication for security monitoring
5. **Normalize data early** - Use `userInfo` hook for data transformation
6. **Separate concerns** - Use `success` hook for side effects (database, analytics)
7. **Test your hooks** - Ensure they handle edge cases
:::

::: warning Common Pitfalls
- Don't perform blocking operations in hooks
- Don't throw errors in `success` hook unless you want to block auth
- Don't modify tokens directly (they're used by the OAuth flow)
- Don't forget to return the user object from `userInfo` hook
:::

## Next Steps

- [Add custom claims](/guides/custom-claims)
- [Implement route protection](/guides/route-protection)
- [Learn about token refresh](/guides/token-refresh)
