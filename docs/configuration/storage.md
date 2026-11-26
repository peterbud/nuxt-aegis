# Storage Configuration

Configure persistent storage for refresh tokens and user data.

## Storage Drivers

Nuxt Aegis supports multiple storage backends for refresh tokens:

| Driver | Use Case | Persistence | Performance |
|--------|----------|-------------|-------------|
| `memory` | Development, testing | ❌ Lost on restart | ⚡ Fastest |
| `fs` | Development, single-server | ✅ Filesystem | 🔶 Medium |
| `redis` | Production, multi-server | ✅ Redis | ⚡ Fast |

::: danger Production Storage
Never use the `memory` or `fs` drivers in production. Use `redis` or another shared database driver for scalable, persistent storage.
:::

::: info Other stores are always memory
Authorization CODEs, magic codes and password reset sessions are short-lived and always use process-local memory. Only refresh tokens use the driver configured here.
:::

## Filesystem Storage

Default storage for development.

### Configuration

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'fs',
        base: './.data/refresh-tokens',
      },
    },
  },
})
```

### Pros and Cons

**Pros:**
- No external dependencies
- Simple setup
- Good for development

**Cons:**
- Not scalable to multiple servers
- File I/O overhead
- Not suitable for production

::: tip Development Only
Filesystem storage is perfect for local development but in production environments, use Redis or a database.
:::

## Redis Storage

Recommended for production deployments.

### Installation

```bash
pnpm add ioredis
```

### Configuration

::: code-group

```typescript [Basic]
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'redis',
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
        db: parseInt(process.env.REDIS_DB || '0'),
        base: 'nuxt-aegis:refresh', // Redis key prefix
        ttl: 60 * 60 * 24 * 7, // Seconds. Match tokenRefresh.cookie.maxAge
      },
    },
  },
})
```
:::

::: warning Set `base` and `ttl` yourself
- `tokenRefresh.storage.driver` only selects the driver. Connection settings belong in `nitro.storage.refreshTokenStore`.
- The module defaults `base` to `./.data/refresh-tokens`, which the Redis driver would use as a key prefix. Set your own `base`.
- Nuxt Aegis does not set a TTL on stored tokens. Redis only expires keys if you set the driver `ttl` option, as above. Without it, expired tokens are removed by the [cleanup tasks](#automatic-cleanup-tasks).
:::

### Environment Variables

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

### Pros and Cons

**Pros:**
- High performance
- Scales to multiple servers
- Native key expiration through the driver `ttl` option
- Production-ready

**Cons:**
- Requires Redis server
- Additional infrastructure

## Memory Storage

In-memory storage for testing only.

### Configuration

```typescript
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

::: danger Data Loss
Memory storage loses all data on server restart. Only use for automated testing.
:::

## Encryption at Rest

Enable encryption for the refresh token records in storage.

### Configuration

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      encryption: {
        enabled: true,
        // The key is read from NUXT_NUXT_AEGIS_TOKEN_REFRESH_ENCRYPTION_KEY at runtime
        algorithm: 'aes-256-gcm',
      },
    },
  },
})
```

### Generate Encryption Key

```bash
# Generate an encryption key (44 characters)
openssl rand -base64 32
```

Add to `.env`:

```bash
NUXT_NUXT_AEGIS_TOKEN_REFRESH_ENCRYPTION_KEY=your-generated-encryption-key
```

The key length is not validated. Only the first 32 characters are used, and a shorter key is padded with `0`.

### What Gets Encrypted

When encryption is enabled, the whole stored record is encrypted with AES-256-GCM:

- `sub`, `expiresAt`, `isRevoked` and `previousTokenHash`
- Provider user data (`providerUserInfo`) and the provider name
- Custom claims

The storage key (the SHA-256 hash of the refresh token) is not encrypted.

::: tip Encryption at rest
Encryption protects the stored data if someone reads the storage backend directly. Records written before you enable encryption stay readable and unencrypted until they are rewritten.
:::

## Storage Key Format

Each refresh token is stored under one key: the SHA-256 hash (hex) of the refresh token value. The raw token is never stored. There is no per-user key and no prefix.

**Example:**
- Refresh token: `k3J...` (random, only sent in the cookie)
- Full key: `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`

With the Redis driver, the driver `base` option is added in front of this key.

## Expiration

Each stored record contains an `expiresAt` timestamp, set from the cookie `maxAge`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      cookie: {
        maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      },
    },
  },
})
```

The server rejects expired and revoked tokens when it reads them. It does not set a storage TTL, so the record stays in storage until a [cleanup task](#automatic-cleanup-tasks) removes it. With Redis, you can also set the driver `ttl` option to the same value as `maxAge`.

::: warning Revoked tokens stay in storage
Rotation marks the old token as revoked instead of deleting it. Run the cleanup task to remove revoked and expired records.
:::

## OAuth Login Transactions

OAuth login uses a separate module-owned, process-local memory store. It does not
use `refreshTokenStore` or `authCodeStore`.

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    oauthTransaction: {
      driver: 'memory',
      capacity: 10_000,
      trustProxy: false,
    },
  },
})
```

These settings are private runtime configuration. The fixed lifetime is ten minutes.
Each record contains a random state, a SHA-256 proof hash, provider/client/redirect
context, timestamps, and optional application metadata, never provider tokens,
client secrets, application JWTs, or user data. Validation and deletion are one
synchronous operation. Expired records are pruned on initiation and rejected on
consumption. At capacity, new logins fail rather than evicting valid transactions.
The browser handler allows eight pending proof cookies; expired cookies are cleared
before counting. Successful callbacks and correlated denials clear their cookie.

::: danger Single-Process OAuth Only
This release does not support shared OAuth transaction storage. Redis, filesystem,
and arbitrary Nitro drivers are rejected for `oauthTransaction.driver`; no fallback
to memory occurs when an unsupported driver is requested. Configuring Redis for
refresh tokens does not make OAuth transactions shared. Run OAuth initiation and
callback in the same long-lived process. Multi-process, multi-instance, and
serverless OAuth deployments are unsupported. Load-balancer affinity does not make
this store shared or durable. Restarting the process invalidates pending logins.
:::

Behind an HTTPS-terminating proxy, set `oauthTransaction.trustProxy: true` only when
the application is reachable exclusively through trusted proxies that overwrite
`X-Forwarded-Proto`. This opts into Nuxt's forwarded-protocol handling for redirect
URIs and cookie security. Arbitrary forwarded headers are ignored by default.
Configure an explicit provider `redirectUri` when the public host differs from the
server request host; forwarded host headers are not enabled by this option.

Proof cookies use HttpOnly, SameSite=Lax, Path=/, and ten-minute expiry. HTTPS uses
Secure and the `__Host-` prefix. Local HTTP uses neither Secure nor that prefix.
These cookies protect pending OAuth login only; they do not bind issued bearer JWTs.

## Automatic Cleanup Tasks

Nuxt Aegis includes built-in scheduled tasks that clean up expired data. By default, the module schedules them daily at 2:00 AM. It only adds a task to the default schedule if you have not already scheduled it yourself.

### Cleanup Tasks

**Authorization CODE Cleanup** (`cleanup:auth-codes`)
- Removes expired authorization CODEs from the in-memory CODE store

**Refresh Token Cleanup** (`cleanup:refresh-tokens`)
- Removes expired and revoked refresh tokens from storage
- Prevents storage buildup from old sessions
- Reports expired vs revoked token counts

**Magic Code Cleanup** (`cleanup:magic-codes`)
- Removes expired magic codes for passwordless authentication
- Cleans up associated lookup keys
- Removes orphaned lookup keys pointing to non-existent codes

**Reset Session Cleanup** (`cleanup:reset-sessions`)
- Removes expired password reset sessions
- Ensures reset links expire properly

### Task Configuration

To change the schedule, set `nitro.scheduledTasks` in `nuxt.config.ts`. Tasks you list are not added to the default schedule again, so list every task you want to run:

```typescript
export default defineNuxtConfig({
  nitro: {
    scheduledTasks: {
      // Run cleanup tasks every 6 hours (cron format)
      '0 */6 * * *': [
        'cleanup:auth-codes',
        'cleanup:refresh-tokens',
        'cleanup:magic-codes',
        'cleanup:reset-sessions',
      ],
    },
  },
})
```

::: tip Task Scheduling
Use standard cron syntax to customize the schedule:
- `0 2 * * *` - Daily at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
:::

### Manual Cleanup

You can also trigger cleanup tasks manually using Nitro's task API:

```typescript
// server/api/admin/cleanup.post.ts
export default defineEventHandler(async (event) => {
  // Ensure user is admin
  const { user } = requireAuth(event).context
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Run cleanup tasks
  const results = await Promise.all([
    runTask('cleanup:auth-codes'),
    runTask('cleanup:refresh-tokens'),
    runTask('cleanup:magic-codes'),
    runTask('cleanup:reset-sessions'),
  ])

  return {
    success: true,
    results,
  }
})
```

## Production Best Practices

::: tip Storage Recommendations
**Development:**
- Use `fs` driver for simplicity
- Store in `./.data/` directory
- Add `.data/` to `.gitignore`

**Production:**
- Use the `redis` driver for scalability
- Set `base` and `ttl` on the Redis driver
- Enable encryption at rest
- Use managed Redis service
- Keep the cleanup tasks scheduled
- Monitor storage usage
- Implement backup strategy
:::

## Comparison Table

| Feature | Memory | Filesystem | Redis |
|---------|--------|------------|-------|
| **Persistence** | ❌ None | ✅ Disk | ✅ Disk/Memory |
| **Multi-server** | ❌ No | ❌ No | ✅ Yes |
| **Performance** | ⚡⚡⚡ Fastest | 🔶 Medium | ⚡⚡ Fast |
| **Setup** | ✅ None | ✅ Simple | 🔶 Requires Redis |
| **Native TTL** | ❌ No | ❌ No | 🔶 Only with the driver `ttl` option |
| **Auto Cleanup** | ✅ Scheduled Tasks | ✅ Scheduled Tasks | ✅ Scheduled Tasks (+ TTL if set) |
| **Production** | ❌ Never | ❌ No | ✅ Recommended |

::: info Automatic Cleanup
Nuxt Aegis includes built-in scheduled tasks that clean up expired tokens, CODEs, magic codes, and reset sessions regardless of storage driver. Redis can additionally expire keys natively if you set the driver `ttl` option.
:::

## Next Steps

- [Learn about token refresh](/guides/token-refresh)
- [Implement route protection](/guides/route-protection)
- [Review security best practices](/security/best-practices)
