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
  
  nitro: {
    storage: {
      refreshTokenStore: {
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

## Manual Cleanup

For filesystem storage, implement manual cleanup:

```typescript
// server/plugins/cleanup-tokens.ts
export default defineNitroPlugin(() => {
  // Run cleanup every hour
  setInterval(async () => {
    const storage = useStorage('refreshTokenStore')
    const keys = await storage.getKeys('refresh:')
    
    for (const key of keys) {
      const data = await storage.getItem(key)
      
      // Remove if expired
      if (data && isExpired(data.expiresAt)) {
        await storage.removeItem(key)
      }
    }
  }, 60 * 60 * 1000) // 1 hour
})

function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt
}
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
| **Production** | ❌ Never | ❌ No | ✅ Recommended |

## Next Steps

- [Learn about token refresh](/guides/token-refresh)
- [Implement route protection](/guides/route-protection)
- [Review security best practices](/security/best-practices)
