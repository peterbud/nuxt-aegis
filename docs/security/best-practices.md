# Security Best Practices

Essential security recommendations for production deployments.

## 1. Secure Secrets Management

::: danger Critical: Never Commit Secrets
Never commit secrets to version control. Use environment variables and secret management services.
:::

**Recommendations:**

```bash
# Generate strong secrets
openssl rand -base64 32  # For JWT token secret
openssl rand -base64 32  # For encryption key

# Store in environment variables
NUXT_AEGIS_TOKEN_SECRET=your-generated-secret-here
NUXT_AEGIS_ENCRYPTION_KEY=your-encryption-key-here
```

**Use secret management services:**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Google Secret Manager

**Rotate secrets regularly:**
- JWT token secrets: Every 90 days
- Encryption keys: Every 180 days
- OAuth client secrets: When provider allows

## 2. HTTPS Enforcement

::: danger Production Requirement
Always use HTTPS in production. HTTP exposes tokens to interception.
:::

**Enforce HTTPS:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      cookie: {
        secure: true,  // HTTPS only
        sameSite: 'strict',
      },
    },
  },
})
```

**Redirect HTTP to HTTPS:**

```typescript
// server/middleware/https-redirect.ts
export default defineEventHandler((event) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = event.node.req.headers['x-forwarded-proto']
    if (proto === 'http') {
      return sendRedirect(event, `https://${event.node.req.headers.host}${event.node.req.url}`, 301)
    }
  }
})
```

## 3. Use Production Storage

::: danger Never Use Filesystem Storage in Production
Filesystem storage doesn't scale and creates security risks. Use Redis or a database.
:::

**Production storage configuration:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'redis',  // Production-ready
      },
    },
  },
  nitro: {
    storage: {
      refreshTokenStore: {
        driver: 'redis',
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: {
          rejectUnauthorized: true,
        },
      },
    },
  },
})
```

**Managed Redis services:**
- Upstash (serverless)
- Redis Cloud
- AWS ElastiCache
- Azure Cache for Redis

## 4. Enable Encryption at Rest

::: warning Sensitive Data Protection
Enable encryption when storing user emails, names, or other PII with refresh tokens.
:::

**Configuration:**

```typescript
// nuxt.config.ts
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

**Generate encryption key:**

```bash
openssl rand -base64 32
```

## 5. Token Rotation Strategy

::: tip Choose the Right Strategy
Enable token rotation for maximum security, or disable for fixed-duration sessions.
:::

**Rotation Enabled (Default - Recommended):**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      rotationEnabled: true,  // Default: rotate on every refresh
    },
  },
})
```

**When to enable rotation:**
- ✅ Production applications
- ✅ High-security requirements
- ✅ Single-device or primary device usage
- ✅ Want to follow OAuth 2.0 best practices
- ✅ Need protection against token replay attacks

**Benefits:**
- **Maximum security** - stolen tokens are quickly invalidated
- **Automatic refresh** - sessions extend with regular use
- **Replay protection** - old tokens immediately revoked

**Rotation Disabled:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      rotationEnabled: false,  // Reuse tokens until expiry
    },
  },
})
```

**When to disable rotation:**
- ⚠️ Development/testing environments
- ⚠️ Fixed-duration session requirements
- ⚠️ Multi-device token sharing needed
- ⚠️ Multi-tab applications where rotation causes issues

**Trade-offs:**
- **Lower security** - stolen tokens valid until expiry (e.g., 7 days)
- **Fixed sessions** - session expires exactly after configured duration
- **Simpler** - fewer storage operations

::: warning Security Consideration
When `rotationEnabled: false`, a compromised refresh token remains valid until its expiry date. Consider using shorter `maxAge` values (e.g., 24 hours instead of 7 days) to limit exposure.
:::

## 6. Short Token Lifetimes

::: tip Balance Security and UX
Use short access token lifetimes (1 hour) and longer refresh tokens (7 days).
:::

**Recommended configuration:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      expiresIn: '1h',  // Short-lived access tokens
    },
    tokenRefresh: {
      rotationEnabled: true,  // Enable rotation for security
      cookie: {
        maxAge: 60 * 60 * 24 * 7,  // 7 days for refresh tokens
      },
    },
  },
})
```

**Without rotation (shorter refresh token lifetime recommended):**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      expiresIn: '1h',
    },
    tokenRefresh: {
      rotationEnabled: false,
      cookie: {
        maxAge: 60 * 60 * 24,  // 1 day only (reduced from 7 days)
      },
    },
  },
})
```

## 7. Server-Side Validation

::: danger Always Validate Server-Side
Never rely solely on client-side authentication checks. Always validate on the server.
:::

**Protect API routes:**

```typescript
// server/routes/api/sensitive-data.get.ts
export default defineEventHandler(async (event) => {
  // Server-side validation (REQUIRED)
  const user = await requireAuth(event)
  
  // Check permissions
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin only' })
  }
  
  return await getSensitiveData()
})
```

## 8. Implement Rate Limiting

::: warning Prevent Brute Force Attacks
Rate limit authentication endpoints to prevent credential stuffing and brute force attacks.
:::

**Example rate limiting:**

```typescript
// server/middleware/rate-limit.ts
import { createStorage } from 'unstorage'

const storage = createStorage()
const WINDOW = 15 * 60 * 1000  // 15 minutes
const MAX_REQUESTS = 5

export default defineEventHandler(async (event) => {
  const path = event.node.req.url
  
  if (path?.startsWith('/auth/')) {
    const ip = event.node.req.headers['x-forwarded-for'] || 
               event.node.req.socket.remoteAddress
    const key = `ratelimit:${ip}`
    
    const requests = await storage.getItem(key) || 0
    
    if (requests >= MAX_REQUESTS) {
      throw createError({ statusCode: 429, message: 'Too many requests' })
    }
    
    await storage.setItem(key, requests + 1, { ttl: WINDOW / 1000 })
  }
})
```

## 9. Validate User Input

::: danger Input Validation
Always validate and sanitize user input to prevent injection attacks.
:::

**Example validation:**

```typescript
// server/routes/api/profile.patch.ts
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  
  // Validate input
  const validated = schema.parse(body)
  
  // Update profile
  return await db.users.update({
    where: { id: user.sub },
    data: validated,
  })
})
```

## 10. Monitor Security Events

::: tip Security Monitoring
Log and monitor authentication events for suspicious activity.
:::

**Example logging:**

```typescript
// server/plugins/security-monitoring.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('nuxt-aegis:success', async ({ user, provider, event }) => {
    const ip = event.node.req.headers['x-forwarded-for'] || 
               event.node.req.socket.remoteAddress
    
    await securityLog.info('User authenticated', {
      userId: user.sub,
      provider,
      ip,
      userAgent: event.node.req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    })
  })
  
  // Log failed attempts
  nitroApp.hooks.hook('nuxt-aegis:error', async ({ error, event }) => {
    await securityLog.warn('Authentication failed', {
      error: error.message,
      ip: event.node.req.headers['x-forwarded-for'],
      timestamp: new Date().toISOString(),
    })
  })
})
```

## 10. Regular Security Audits

::: warning Continuous Security
Perform regular security audits and keep dependencies updated.
:::

**Security checklist:**

- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Run security scans (npm audit)
- [ ] Review user permissions quarterly
- [ ] Rotate secrets every 90 days
- [ ] Test disaster recovery procedures
- [ ] Review security headers
- [ ] Audit OAuth provider configurations
- [ ] Check for exposed secrets (git-secrets, trufflehog)
- [ ] Penetration testing annually

**Automated security tools:**

```bash
# Check for vulnerabilities
pnpm audit

# Check for exposed secrets
pnpm add -D @secretlint/secretlint-rule-preset-recommend
pnpm secretlint "**/*"

# Static analysis
pnpm add -D eslint-plugin-security
```

## Additional Resources

### OWASP Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

### OAuth 2.0 Security

- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OAuth 2.0 Threat Model](https://datatracker.ietf.org/doc/html/rfc6819)

## Related

- [Security Overview](/security/)
- [Configuration Reference](/configuration/)
- [Token Refresh Guide](/guides/token-refresh)
