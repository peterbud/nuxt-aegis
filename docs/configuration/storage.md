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
Never use `memory` driver in production. Use `redis`, `fs`, or a database for scalable, persistent storage.
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
        prefix: 'refresh:',
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
        db: parseInt(process.env.REDIS_DB || '0'),
      },
    },
  },
})
```
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
- Built-in TTL (automatic expiration)
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

Enable encryption for sensitive user data stored with refresh tokens.

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
NUXT_AEGIS_ENCRYPTION_KEY=your-generated-32-character-key
```

### What Gets Encrypted

When encryption is enabled, the following user data is encrypted at rest:

- User profile information (name, email)
- Custom claims
- Provider-specific user data
- Any additional user metadata

::: tip Encryption Overhead
Encryption adds minimal CPU overhead (~2-5ms per operation) but significantly improves security for sensitive user data.
:::

## Storage Key Format

Nuxt Aegis uses the following key format in storage:

```
{prefix}{userId}
```

**Example:**
- Prefix: `refresh:`
- User ID: `google:123456789`
- Full key: `refresh:google:123456789`

## TTL (Time To Live)

Refresh tokens automatically expire based on cookie `maxAge`:

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

::: warning Storage TTL
Ensure your storage driver supports TTL. Redis handles this automatically, but filesystem storage requires manual cleanup.
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

The installed unstorage 1.17.5 API provides separate get/remove operations, not an
atomic conditional consume. A future shared backend must implement native
conditional validation and deletion, such as a Redis script, with transaction TTLs.

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

Nuxt Aegis includes built-in scheduled tasks that automatically clean up expired data from storage. These tasks run daily at 2:00 AM by default (configurable via Nitro's `scheduledTasks`).

### Cleanup Tasks

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

The cleanup schedule is configured in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nitro: {
    scheduledTasks: {
      // Run cleanup tasks daily at 2:00 AM (cron format)
      '0 2 * * *': [
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
  const user = await requireUser(event)
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Run cleanup tasks
  const results = await Promise.all([
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
- Use `redis` driver for scalability
- Enable encryption at rest
- Use managed Redis service
- Set appropriate TTL values
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
| **TTL Support** | ❌ Manual | ❌ Manual | ✅ Built-in |
| **Auto Cleanup** | ✅ Scheduled Tasks | ✅ Scheduled Tasks | ✅ TTL + Tasks |
| **Production** | ❌ Never | ❌ No | ✅ Recommended |

::: info Automatic Cleanup
Nuxt Aegis includes built-in scheduled tasks that automatically clean up expired tokens, magic codes, and reset sessions regardless of storage driver. Redis additionally supports native TTL for automatic expiration.
:::

## Next Steps

- [Learn about token refresh](/guides/token-refresh)
- [Implement route protection](/guides/route-protection)
- [Review security best practices](/security/best-practices)
