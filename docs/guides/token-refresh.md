# Token Refresh

Maintain user sessions without re-authentication using automatic token refresh.

## Overview

Nuxt Aegis provides automatic token refresh functionality that:
- Refreshes access tokens transparently
- Stores refresh tokens securely server-side
- Handles token expiration gracefully
- Supports optional encryption at rest

## How Token Refresh Works

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Storage
    participant OAuth

    Note over Client,OAuth: Initial Authentication
    Client->>Server: Login via OAuth
    Server->>OAuth: Exchange auth CODE
    OAuth-->>Server: Access + Refresh tokens
    Server->>Storage: Store refresh token + user data
    Server-->>Client: Set refresh token cookie
    Server-->>Client: Return access token (JWT)

    Note over Client,Storage: Token Refresh Flow
    Client->>Server: Request with expired access token
    Server-->>Client: API 401
    Client->>Server: POST /auth/refresh with cookie
    Server->>Storage: Retrieve refresh token + user
    alt Valid refresh session
      Server->>Server: Generate access token with stored claims
      Server-->>Client: New access token
      Client->>Server: Replay original request once
    else Invalid refresh session
      Server-->>Client: Refresh 401 and clear cookie
      Note over Client: Clear auth; API interceptor redirects
    else Verification unavailable or prohibited
      Server-->>Client: 5xx or 403; cookie not cleared
      Note over Client: Expose failure; do not replay or renew token
    end
```

**The refresh flow:**

1. **Initial Authentication** - After OAuth login, refresh token is stored server-side with complete user data
2. **Auto-Refresh on Startup** - When app initializes with a valid refresh token cookie, it automatically gets a new access token
3. **Expiration Handling** - When access token expires, client requests a new one using the refresh token cookie
4. **Token Generation** - Server retrieves stored user object and regenerates access token with the same custom claims
5. **Optional Rotation** - Server can rotate (replace) the refresh token for additional security

Missing, unknown, expired, or revoked refresh tokens return 401 and clear the cookie. Prohibited refresh returns 403; unexpected failures return 5xx without clearing it. Public responses do not expose storage details or token values.

## Configuration

### Basic Setup

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true, // Refresh on app startup
      cookie: {
        cookieName: 'nuxt-aegis-refresh',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      },
    },
  },
})
```

### Complete Configuration

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true,
      rotationEnabled: true,          // Enable refresh token rotation
      
      // Cookie configuration
      cookie: {
        cookieName: 'nuxt-aegis-refresh',
        maxAge: 60 * 60 * 24 * 7,   // 7 days in seconds
        secure: true,                // HTTPS only
        httpOnly: true,              // Not accessible to JavaScript
        sameSite: 'lax',             // CSRF protection
        path: '/',
      },
      
      // Persistent storage
      storage: {
        driver: 'redis',             // 'fs', 'redis', or 'memory'
        prefix: 'refresh:',
        base: './.data/refresh-tokens',
      },
      
      // Encryption at rest
      encryption: {
        enabled: true,
        key: process.env.NUXT_AEGIS_ENCRYPTION_KEY!,
        algorithm: 'aes-256-gcm',
      },
    },
  },
})
```

## Automatic Refresh

When `automaticRefresh: true`, the module automatically:

1. Attempts initial resolution on mount, except on callback/public routes or when a token already exists.
2. Refreshes after a client API 401 and replays once only if refresh succeeds.
3. Shares in-flight refresh work between concurrent callers.

An expected startup 401 resolves quietly to guest, with no public error or error-level log. Startup network/5xx failures leave status unknown with an error; established sessions retain identity. A 403 does not imply a guest session. There is no pre-expiry timer or background retry loop.

Only refresh-session rejection triggers the API interceptor's configured error redirect. Other failures remain available to `$api` and `useAegisFetch` consumers. Preserved identity does not extend access-token validity.

## Refresh Token Storage

Refresh tokens are stored server-side in a **persistent storage layer** that survives server restarts.

### What's Stored

Each refresh token entry includes:

- **Hashed token value** (SHA-256 hash used as storage key)
- **Complete user object** (all profile data from OAuth provider)
- **Subject identifier** (`sub`)
- **Expiration timestamp**
- **Revocation status** (for logout/invalidation)
- **Optional encrypted data** (if encryption enabled)

### Storage Drivers

::: code-group

```typescript [Filesystem (Development)]
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'fs',
        base: './.data/refresh-tokens',
        prefix: 'refresh:',
      },
    },
  },
})
```

```typescript [Redis (Production)]
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'redis',
        prefix: 'refresh:',
      },
    },
  },
  nitro: {
    storage: {
      refreshTokenStore: {
        driver: 'redis',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
    },
  },
})
```

```typescript [Memory (Testing Only)]
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'memory',
      },
    },
  },
  nitro: {
    storage: {
      refreshTokenStore: {
        driver: 'memory',
      },
    },
  },
})
```

:::

::: danger Production Storage
Never use `memory` or `fs` drivers in production. Use Redis or a database for scalable, persistent storage.
:::

## Encryption at Rest

Enable AES-256-GCM encryption for sensitive user data stored with refresh tokens.

### Configuration

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      encryption: {
        enabled: true,
        key: process.env.NUXT_AEGIS_ENCRYPTION_KEY!,
        algorithm: 'aes-256-gcm',
      },
    },
  },
})
```

### Generate Encryption Key

```bash
# Generate a 32-character encryption key
openssl rand -base64 32
```

Add to `.env`:

```bash
NUXT_AEGIS_ENCRYPTION_KEY=your-generated-32-character-key-here
```

### Security Features

- **AES-256-GCM** authenticated encryption
- **Random IV** (initialization vector) for each encryption
- **Transparent operation** (automatic encrypt/decrypt)
- **Storage protection** (protects against storage backend compromise)
- **Authentication tags** (prevents tampering)

### When to Use Encryption

- ✅ When storing sensitive user data (emails, names, etc.)
- ✅ When using shared storage backends (e.g., Redis)
- ✅ When compliance requires encryption at rest
- ✅ When storage backend is not fully trusted

::: tip Performance Impact
Encryption adds minimal CPU overhead (~2-5ms per operation) but significantly improves security.
:::

## Manual Refresh

You can manually refresh tokens using the `useAuth` composable:

```vue
<script setup lang="ts">
const { refresh, isLoading, error } = useAuth()

async function refreshToken() {
  try {
    await refresh()
  } catch {
    console.error(error.value?.message)
  }
}
</script>

<template>
  <div>
    <p v-if="error">{{ error.message }}</p>
    <button :disabled="isLoading" @click="refreshToken">
      Retry Session
    </button>
  </div>
</template>
```

::: info Automatic vs Manual
Use `ensureResolved()` to retry unknown startup state and `refresh()` to recover an established session. Both share in-flight work and clear stale errors on a new attempt. Explicit `refresh()` rejects on failure, including 401; successful recovery clears the error.
:::

## Custom Claims on Refresh

Custom claims are **resolved once during initial authentication** and then **stored with the refresh token**. When tokens are refreshed, the stored claims are reused - the customClaims callback is **not re-executed**.

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin(() => {
  defineAegisHandler({
    customClaims: async (user) => {
      // This runs ONLY during initial login
      // The result is stored and reused on every refresh
      const userRole = await db.getUserRole(user.email)
      
      return {
        role: userRole,
        premium: await checkPremiumStatus(user.email),
      }
    },
  })
})
```

**Why claims are stored:**
- ✅ **Fast refresh** - No database queries during token refresh
- ✅ **Consistent claims** - Claims don't change unexpectedly
- ✅ **Reliable state** - No chance of callback errors during refresh

**When claims are stored:**
- Initial login (OAuth flow)
- Password authentication
- User impersonation

**When stored claims are reused:**
- Every token refresh (automatic or manual)
- SSR token generation
- Until user logs out or session expires

::: tip Updating Claims
If user data changes (role, permissions, etc.) and you need to update the JWT claims without logout/login, use `refresh({ updateClaims: true })`. See the [Updating Claims](/guides/updating-claims) guide.
:::

## Token Rotation

Nuxt Aegis supports automatic refresh token rotation as an additional security measure.

### What is Token Rotation?

Token rotation means that every time you use a refresh token to get a new access token, you also receive a **new refresh token** and the old one is immediately revoked. This limits the window of opportunity if a refresh token is compromised.

### Configuration

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      rotationEnabled: true,  // Default: true
    },
  },
})
```

### Rotation Enabled (Default)

When `rotationEnabled: true`:

- **New refresh token** generated on every refresh
- **Old refresh token** immediately revoked
- **Cookie updated** with new token
- **Maximum security** - follows OAuth 2.0 best practices

**Best for:**
- Production applications
- High-security requirements
- Preventing token replay attacks
- Single-device usage

```typescript
// With rotation enabled:
// 1. User refreshes access token
// 2. Server generates NEW refresh token (7 days from now)
// 3. Server revokes OLD refresh token
// 4. Cookie set with new token
// 5. User's session effectively never expires (as long as they use the app)
```

### Rotation Disabled

When `rotationEnabled: false`:

- **Same refresh token** reused until expiry
- **No new tokens** generated on refresh
- **Fixed session duration** - exactly 7 days (or configured maxAge)
- **Multi-tab friendly** - all tabs can use the same token

**Best for:**
- Development/testing
- Multi-tab applications
- When session should expire after exact duration
- Reducing storage operations

```typescript
// With rotation disabled:
// 1. User refreshes access token
// 2. Server reuses SAME refresh token
// 3. No new token generated
// 4. Cookie refreshed with original expiry
// 5. Session expires exactly 7 days after initial login
```

### Security Trade-offs

| Aspect | Rotation Enabled | Rotation Disabled |
|--------|-----------------|-------------------|
| **Security** | ✅ Maximum - token replay protection | ⚠️ Lower - stolen token valid until expiry |
| **Session Duration** | ♾️ Indefinite (with regular use) | ⏱️ Fixed (e.g., 7 days exactly) |
| **Multi-tab Support** | ⚠️ May create multiple tokens | ✅ All tabs share same token |
| **Storage Operations** | 📝 More writes (on every refresh) | 📝 Fewer writes |
| **Complexity** | 🔄 Token rotation tracking | ✅ Simple reuse |

::: tip Recommendation
Keep `rotationEnabled: true` (default) for production applications unless you have specific requirements for fixed-duration sessions or multi-device token sharing.
:::

::: warning SSR Token Generation
During SSR, the module **never rotates** refresh tokens regardless of this setting. This prevents client/server state conflicts during server-side rendering.
:::

## Logout and Token Revocation

When users log out, refresh tokens are revoked:

```typescript
const { logout } = useAuth()

// Logout (revokes refresh token)
await logout()
```

Server-side logout implementation:

```typescript
// server/routes/logout.post.ts
export default defineEventHandler(async (event) => {
  // Get refresh token from cookie
  const refreshToken = getCookie(event, 'nuxt-aegis-refresh')
  
  if (refreshToken) {
    // Delete from storage
    const storage = useStorage('refreshTokenStore')
    await storage.removeItem(`refresh:${refreshToken}`)
    
    // Delete cookie
    deleteCookie(event, 'nuxt-aegis-refresh')
  }
  
  return { success: true }
})
```

## Testing Token Refresh

If your app tests do not register Nuxt Aegis auth routes, disable automatic refresh to avoid unrelated startup failures. A real missing-session 401 is expected and quiet; a missing endpoint is not.

```typescript
const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      automaticRefresh: !isTest,
    },
  },
})
```

Use this only for application tests that do not cover authentication flows. Keep `automaticRefresh: true` in integration or end-to-end tests that validate login, refresh, or session restoration behavior.

::: tip
Disable `automaticRefresh`, not `enabled`. Automatic startup refresh and retry behavior are controlled by `tokenRefresh.automaticRefresh`.
:::

Test refresh functionality in your test suite:

```typescript
import { describe, it, expect } from 'vitest'
import { $fetch } from '@nuxt/test-utils'

describe('Token Refresh', () => {
  it('should refresh expired tokens', async () => {
    // Authenticate and get tokens
    const { accessToken, refreshToken } = await authenticate()
    
    // Wait for access token to expire
    await waitForExpiration(accessToken)
    
    // Request refresh
    const response = await $fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: `nuxt-aegis-refresh=${refreshToken}`
      }
    })
    
    expect(response.accessToken).toBeDefined()
    expect(response.accessToken).not.toBe(accessToken)
  })
  
  it('should reject invalid refresh tokens', async () => {
    await expect($fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: 'nuxt-aegis-refresh=invalid-token'
      }
    })).rejects.toThrow('401')
  })
})
```

## Monitoring and Debugging

Inspect `useAuth().error` for `category`, `message`, and HTTP `status` where present. Expected startup 401s are not application errors. Unexpected server failures are logged without token values or internal details in responses; network/5xx failures should be monitored separately from session rejection.

Tests should distinguish startup 401 from 503/offline failures, verify cookie cleanup only for invalid sessions, and check explicit recovery. For API calls, verify no replay after failed refresh and no second refresh after a replayed 401.

## Best Practices

::: tip Recommendations
1. **Use automatic refresh** - Enable `automaticRefresh: true` for seamless UX
2. **Use Redis in production** - Don't rely on filesystem storage
3. **Enable encryption** - Protect sensitive user data at rest
4. **Set appropriate TTL** - Balance security and convenience (7 days is common)
5. **Rotate tokens** - Consider rotating refresh tokens periodically
6. **Monitor refresh events** - Track refresh failures for security
7. **Distinguish failures** - Offer retry for transient failures; request login only for a rejected session
8. **Use HTTPS** - Always set `secure: true` in production
:::

::: warning Common Pitfalls
- Don't store refresh tokens client-side (use httpOnly cookies)
- Don't use memory storage in production
- Don't forget to clean up expired tokens
- Don't expose refresh tokens in logs or error messages
- Don't rely on refresh tokens lasting forever (they expire)
:::

## Next Steps

- [Configure storage backends](/configuration/storage)
- [Learn about authorization CODE flow](/guides/authorization-code)
- [Review security best practices](/security/best-practices)
