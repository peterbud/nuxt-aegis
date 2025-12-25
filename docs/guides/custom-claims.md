# Custom Claims

Add application-specific data to your JWT tokens using custom claims.

## Overview

Custom claims allow you to enrich JWT tokens with additional user data beyond the standard OAuth profile. Claims can be static values or dynamic functions that fetch data from databases or external APIs.

Nuxt Aegis supports custom claims at two levels:

1. **Provider-level claims**: Specific to each OAuth provider (e.g., Google, GitHub)
2. **Handler-level claims**: Global fallback that applies to all providers

::: tip Priority
Provider-level claims take precedence over handler-level claims when both are defined.
:::

## Provider-Level Claims

### Static Custom Claims

Add fixed values to all tokens for a specific provider:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: {
    role: 'admin',
    department: 'engineering',
    accountType: 'premium',
  },
})
```

All tokens issued after Google authentication will include these claims:

```json
{
  "sub": "google:123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",
  "department": "engineering",
  "accountType": "premium"
}
```

### Dynamic Custom Claims

Use a callback function to compute claims dynamically:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    return {
      role: user.email?.endsWith('@admin.com') ? 'admin' : 'user',
      permissions: getUserPermissions(user.email),
      emailVerified: user.email_verified || false,
      loginCount: await getLoginCount(user.sub),
    }
  },
})
```

::: tip Dynamic Claims
The callback receives two arguments:
- `user`: User information from the OAuth provider
- `tokens`: OAuth tokens (`access_token`, `refresh_token`, `id_token`, `expires_in`)
:::

## Database Lookups

Fetch user data from your database:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    // Fetch user profile from database
    const userProfile = await db.getUserProfile(user.email)
    
    return {
      role: userProfile.role,
      permissions: userProfile.permissions,
      organizationId: userProfile.organizationId,
      subscription: userProfile.subscription,
    }
  },
})
```

::: code-group

```typescript [With Prisma]
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    const profile = await prisma.user.findUnique({
      where: { email: user.email },
      include: { organization: true },
    })
    
    return {
      role: profile?.role || 'user',
      organizationId: profile?.organization?.id,
      tier: profile?.tier || 'free',
    }
  },
})
```

```typescript [With Drizzle]
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    const [profile] = await db
      .select()
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1)
    
    return {
      role: profile?.role || 'user',
      departmentId: profile?.departmentId,
      isActive: profile?.isActive || false,
    }
  },
})
```

:::

## Using Provider Tokens

Access the OAuth provider's access token to fetch additional data:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    // Fetch additional data from Google using their access token
    const extraData = await $fetch('https://people.googleapis.com/v1/people/me?personFields=phoneNumbers', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    })
    
    return {
      role: determineRole(user),
      phoneNumber: extraData.phoneNumbers?.[0]?.value,
      verified: user.email_verified,
    }
  },
})
```

::: warning Token Refresh
During token refresh, the custom claims callback is invoked again with the stored user object. Provider tokens are NOT available during refresh since we're not re-authenticating with the provider.
:::

## Handler-Level Claims

Handler-level claims provide a global function that applies to all authentication methods when provider-level claims are not defined. This is particularly useful for:

- Centralizing logic across multiple OAuth providers
- Supporting password authentication (which doesn't have provider-level customClaims)
- Implementing consistent permission models

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin(() => {
  defineAegisHandler({
    // Global custom claims handler
    customClaims: async (user) => {
      // Fetch from database based on user ID
      const dbUser = await db.getUserById(user.userId)
      
      return {
        role: dbUser.role,
        permissions: dbUser.permissions,
        organizationId: dbUser.organizationId,
      }
    },
    
    onUserPersist: async (user, { provider }) => {
      // Persist user to database...
      return { userId: dbUser.id }
    },
  })
})
```

### Priority Rules

When both provider-level and handler-level claims are defined:

```typescript
// server/plugins/aegis.ts
defineAegisHandler({
  customClaims: async (user) => {
    return {
      role: 'user',      // ← Will be overridden by provider
      tier: 'free',      // ← Will be used (not in provider claims)
    }
  },
})

// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: {
    role: 'admin',  // ← Takes priority
  },
})

// Result: { role: 'admin', tier: 'free' }
```

::: tip Best Practice
Use handler-level claims for shared authorization logic and provider-level claims for provider-specific attributes.
:::

## Supported Claim Types

Custom claims support the following types:

| Type | Example | Supported |
|------|---------|-----------|
| `string` | `'admin'` | ✅ |
| `number` | `42` | ✅ |
| `boolean` | `true` | ✅ |
| `null` | `null` | ✅ |
| `Array<primitive>` | `['read', 'write']` | ✅ |
| `object` | `{ nested: 'value' }` | ❌ |
| `function` | `() => {}` | ❌ |
| `undefined` | `undefined` | ❌ |

::: danger Nested Objects Not Allowed
Custom claims cannot contain nested objects or functions. Only primitive values and arrays of primitives are supported.
:::

## Reserved Claims

The following JWT claims are **reserved** and cannot be overridden:

- `iss` - Issuer
- `sub` - Subject (user ID)
- `exp` - Expiration time
- `iat` - Issued at
- `nbf` - Not before
- `jti` - JWT ID
- `aud` - Audience

If you attempt to override these, they will be filtered out and a warning will be logged.

```typescript
export default defineOAuthGoogleEventHandler({
  customClaims: {
    role: 'admin',
    exp: 9999999999, // ❌ Will be filtered out and warning logged
    sub: 'custom-id', // ❌ Will be filtered out and warning logged
  },
})
```

## Common Use Cases

### Role-Based Access Control (RBAC)

```typescript
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    // Determine role based on email domain
    let role = 'user'
    if (user.email?.endsWith('@company.com')) {
      role = user.email.endsWith('@admin.company.com') ? 'admin' : 'employee'
    }
    
    return { role }
  },
})
```

Access in your app:

```typescript
// Server-side
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin only' })
  }
  
  return { data: 'sensitive' }
})

// Client-side
const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')
```

### Permissions Array

```typescript
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    const permissions = await db.getUserPermissions(user.email)
    
    return {
      permissions: permissions.map(p => p.name), // ['posts:create', 'posts:delete']
    }
  },
})
```

Check permissions:

```typescript
// server/utils/requirePermission.ts
export async function requirePermission(event: H3Event, permission: string) {
  const user = await requireAuth(event)
  
  if (!user.permissions?.includes(permission)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }
  
  return user
}
```

### Organization/Tenant ID

```typescript
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    const org = await db.getOrganizationByEmail(user.email)
    
    return {
      organizationId: org.id,
      organizationName: org.name,
      tier: org.tier, // 'free', 'pro', 'enterprise'
    }
  },
})
```

### Feature Flags

```typescript
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    const features = await getFeatureFlagsForUser(user.email)
    
    return {
      features: features.filter(f => f.enabled).map(f => f.name),
      betaAccess: features.some(f => f.name === 'beta'),
    }
  },
})
```

### Subscription Status

```typescript
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    const subscription = await db.getSubscription(user.email)
    
    return {
      premium: subscription?.status === 'active',
      plan: subscription?.plan || 'free',
      expiresAt: subscription?.expiresAt?.toISOString(),
    }
  },
})
```

## Type Safety

Define custom claim types for full type safety:

```typescript
// types/auth.ts
export interface CustomClaims {
  role: 'admin' | 'user' | 'guest'
  permissions: string[]
  organizationId: string
  premium: boolean
}

// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens): Promise<CustomClaims> => {
    // TypeScript will enforce return type
    return {
      role: 'user',
      permissions: [],
      organizationId: '123',
      premium: false,
    }
  },
})

// Client-side usage
const { user } = useAuth<User & CustomClaims>()
const role = user.value?.role // Type: 'admin' | 'user' | 'guest'
```

## Testing Custom Claims

Test custom claims in your test suite:

```typescript
import { describe, it, expect } from 'vitest'
import { $fetch } from '@nuxt/test-utils'

describe('Custom Claims', () => {
  it('should assign role based on email domain', async () => {
    const token = await authenticateAs('admin@company.com')
    const payload = decodeJWT(token)
    
    expect(payload.role).toBe('admin')
  })
  
  it('should include organization ID', async () => {
    const token = await authenticateAs('user@company.com')
    const payload = decodeJWT(token)
    
    expect(payload.organizationId).toBeDefined()
  })
})
```

## Best Practices

::: tip Recommendations
1. **Keep claims small** - JWT size affects every request
2. **Use primitives** - Avoid nested objects
3. **Cache database lookups** - Don't query on every token issue
4. **Validate claim values** - Ensure data types are correct
5. **Document your claims** - Maintain a list of custom claims
6. **Version your claims** - Add version field if structure changes
7. **Consider refresh behavior** - Claims are re-computed on refresh
:::

::: warning Common Pitfalls
- Don't store large amounts of data in claims
- Don't include sensitive secrets in claims
- Don't rely on claims for real-time data (they're cached until refresh)
- Don't forget that claims are visible to the client
:::

## Next Steps

- [Use authentication hooks](/guides/hooks)
- [Implement route protection](/guides/route-protection)
- [Learn about token refresh](/guides/token-refresh)
