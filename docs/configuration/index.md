# Configuration

Complete configuration reference for Nuxt Aegis.

## Complete Configuration Example

Here's a comprehensive configuration showing all available options:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-aegis'],
  
  nuxtAegis: {
    // JWT Token Configuration
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!, // Required
      expiresIn: '1h',              // Access token expiration (default: 1 hour)
      algorithm: 'HS256',           // Signing algorithm (HS256 or RS256)
      issuer: 'https://myapp.com',  // Token issuer
      audience: 'https://myapp.com/api', // Token audience
    },
    
    // Token Refresh Configuration
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true,       // Auto-refresh on app startup
      cookie: {
        cookieName: 'nuxt-aegis-refresh',
        maxAge: 60 * 60 * 24 * 7,   // 7 days in seconds
        secure: true,                // HTTPS only
        sameSite: 'lax',
        httpOnly: true,              // Not accessible to JavaScript
        path: '/',
      },
      // Persistent storage configuration
      storage: {
        driver: 'fs',                // 'fs', 'redis', or 'memory'
        prefix: 'refresh:',
        base: './.data/refresh-tokens',
      },
      // Optional: Encryption at rest
      encryption: {
        enabled: false,              // Enable for sensitive data
        key: process.env.NUXT_AEGIS_ENCRYPTION_KEY, // 32+ characters
        algorithm: 'aes-256-gcm',
      },
    },
    
    // Authorization CODE Configuration
    authCode: {
      expiresIn: 60,                 // CODE lifetime in seconds
    },
    
    // Redirect URLs after successful login/logout
    redirect: {
      login: '/',
      logout: '/',
      success: '/',
      error: '/auth/error',
    },
    
    // Route Protection
    routeProtection: {
      protectedRoutes: ['/dashboard/**', '/admin/**'],
      publicRoutes: ['/login', '/about'],
    },
    
    // API Endpoint Configuration
    endpoints: {
      authPath: '/auth',
    },
    
    // OAuth Providers
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['openid', 'profile', 'email'],
      },
      // Add more providers as needed
    },
  },
  
  // Configure Nitro storage for persistent refresh tokens
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

## Token Configuration

Configure JWT token generation and validation.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | - | **Required**. Secret key for signing JWTs (min 32 characters) |
| `expiresIn` | `string \| number` | `'1h'` | Access token expiration time |
| `algorithm` | `'HS256' \| 'RS256'` | `'HS256'` | JWT signing algorithm |
| `issuer` | `string` | `'nuxt-aegis'` | Token issuer claim |
| `audience` | `string` | `''` | Token audience claim |

::: danger Token Secret
The `secret` must be a cryptographically secure random string of at least 32 characters. Never commit this to version control!
:::

## Token Refresh Configuration

Configure automatic token refresh functionality.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable token refresh functionality |
| `automaticRefresh` | `boolean` | `true` | Auto-refresh tokens before expiration |
| `cookie.cookieName` | `string` | `'nuxt-aegis-refresh'` | Refresh token cookie name |
| `cookie.maxAge` | `number` | `604800` | Cookie max age in seconds (7 days) |
| `cookie.httpOnly` | `boolean` | `true` | HTTP-only flag for security |
| `cookie.secure` | `boolean` | `true` | Secure flag (HTTPS only) |
| `cookie.sameSite` | `'lax' \| 'strict' \| 'none'` | `'lax'` | SameSite cookie attribute |
| `encryption.enabled` | `boolean` | `false` | Enable encryption at rest for user data |
| `encryption.key` | `string` | - | Encryption key (32+ characters) |
| `encryption.algorithm` | `'aes-256-gcm'` | `'aes-256-gcm'` | Encryption algorithm |
| `storage.driver` | `'fs' \| 'redis' \| 'memory'` | `'fs'` | Storage backend driver |
| `storage.base` | `string` | `'./.data/refresh-tokens'` | Base path for filesystem storage |

::: tip Production Storage
In production, use Redis or a database for refresh token storage, not the filesystem.
:::

## Authorization CODE Configuration

Configure the authorization CODE flow security layer.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `expiresIn` | `number` | `60` | CODE expiration time in seconds |

## Redirect Configuration

Configure redirect URLs for different authentication scenarios.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `login` | `string` | `'/'` | Redirect after explicit login |
| `logout` | `string` | `'/'` | Redirect after logout |
| `success` | `string` | `'/'` | Redirect after successful auth |
| `error` | `string` | `'/auth/error'` | Redirect on auth error |

## Route Protection Configuration

Configure which routes require authentication.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `protectedRoutes` | `string[]` | `[]` | Routes that require authentication |
| `publicRoutes` | `string[]` | `[]` | Routes that bypass authentication |

::: tip Pattern Matching
Use glob patterns for route matching:
- `/dashboard/**` matches all routes under `/dashboard`
- `/api/user/*` matches direct children of `/api/user`
:::

## Provider Configuration

Each provider has its own configuration options. See the [Providers](/providers/) section for details.

### Common Provider Options

| Option | Type | Description |
|--------|------|-------------|
| `clientId` | `string` | OAuth client ID |
| `clientSecret` | `string` | OAuth client secret |
| `scopes` | `string[]` | OAuth scopes to request |
| `authorizationParams` | `object` | Custom authorization parameters |

## Environment-Specific Configuration

::: code-group

```typescript [Development]
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!,
      expiresIn: '8h', // Longer for development
    },
    tokenRefresh: {
      cookie: {
        secure: false, // Allow HTTP in dev
      },
    },
  },
})
```

```typescript [Production]
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!,
      expiresIn: '1h', // Shorter for security
    },
    tokenRefresh: {
      cookie: {
        secure: true, // Require HTTPS
        sameSite: 'strict',
      },
      storage: {
        driver: 'redis', // Use Redis in production
      },
      encryption: {
        enabled: true, // Enable encryption
        key: process.env.NUXT_AEGIS_ENCRYPTION_KEY!,
      },
    },
  },
})
```

:::

## Next Steps

- [Configure environment variables](/configuration/environment)
- [Set up storage backends](/configuration/storage)
- [Learn about OAuth providers](/providers/)
