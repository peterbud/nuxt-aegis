# Configuration

Complete configuration reference for Nuxt Aegis.

## Complete Configuration Example

Here's a comprehensive configuration showing all available options:

```typescript
export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  
  nuxtAegis: {
    // JWT Token Configuration
    token: {
      secret: '...', // Required
      expiresIn: '1h',              // Access token expiration (default: 1 hour)
      algorithm: 'HS256',           // Signing algorithm (HMAC: HS256, HS384 or HS512)
      issuer: 'https://myapp.com',  // Token issuer
      audience: 'https://myapp.com/api', // Token audience
    },
    
    // Token Refresh Configuration
    tokenRefresh: {
      automaticRefresh: true,       // Resolve auth on app mount and refresh after a 401
      rotationEnabled: true,        // Enable refresh token rotation
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
        base: './.data/refresh-tokens', // Directory (fs) or key prefix (redis)
      },
      // Optional: Encryption at rest
      encryption: {
        enabled: false,              // Enable for sensitive data
        key: '...', // At least 32 characters (only the first 32 are used)
        algorithm: 'aes-256-gcm',
      },
    },
    
    // Authorization CODE Configuration
    authCode: {
      expiresIn: 60,                 // CODE lifetime in seconds
    },

    oauthTransaction: {
      driver: 'memory',
      capacity: 10_000,
      trustProxy: false,
    },
    
    // Redirect URLs after successful authentication/logout/errors
    redirect: {
      logout: '/',
      success: '/',
      error: '/',
    },
    
    // Client-Side Middleware Configuration
    clientMiddleware: {
      enabled: true,                 // Enable built-in client middleware
      global: false,                 // Apply globally to all pages
      redirectTo: '/login',          // Redirect for unauthenticated users
      loggedOutRedirectTo: '/',      // Redirect for authenticated users on logged-out pages
      publicRoutes: ['/', '/about'], // Routes to exclude from protection
    },

    // Impersonation Configuration
    impersonation: {
      enabled: false,                // Disabled by default
      tokenExpiration: 900,          // 15 minutes
    },
    
    // API Endpoint Configuration
    endpoints: {
      authPath: '/auth',           // Base path for auth routes
      loginPath: '/auth',          // Base path for login (login URLs: [loginPath]/[provider])
      callbackPath: '/auth/callback', // OAuth callback path
      logoutPath: '/auth/logout',  // Logout endpoint path
      refreshPath: '/auth/refresh', // Token refresh endpoint path
      userInfoPath: '/api/user/me', // User info endpoint path
    },
    
    // OAuth Providers
    providers: {
      google: {
        clientId: '...',
        clientSecret: '...',
        scopes: ['openid', 'profile', 'email'],
      },
      // Add more providers as needed
    },
  },
  
  // Server-Side Route Protection via Nitro Route Rules
  nitro: {
    routeRules: {
      // Protect all API routes
      '/api/**': { nuxtAegis: { auth: true } },
      // Public API routes (override)
      '/api/public/**': { nuxtAegis: { auth: false } },
    },
  },
})
```

OAuth transaction settings are private and separate from authorization CODE and
refresh-token storage. Only single-process memory storage is supported in this
release. See [OAuth transaction configuration](/configuration/storage#oauth-login-transactions)
for capacity, proxy trust, cookie policy, and deployment limits.

## Token Configuration

Configure JWT token generation and validation.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | - | **Required**. Secret key for signing JWTs (at least 32 characters recommended; not enforced) |
| `expiresIn` | `string \| number` | `'1h'` | Access token expiration time |
| `algorithm` | `'HS256' \| 'HS384' \| 'HS512'` | `'HS256'` | JWT signing algorithm. Tokens are signed with the shared `secret`, so only HMAC algorithms work. RS* values are accepted by the type but are not yet supported |
| `issuer` | `string` | `'nuxt-aegis'` | Token issuer claim |
| `audience` | `string` | `''` | Token audience claim |

::: danger Token Secret
The `secret` must be a cryptographically secure random string of at least 32 characters. The module does not check the length, so a short secret is accepted silently. Never commit this to version control!
:::

## Token Refresh Configuration

Configure automatic token refresh functionality.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `automaticRefresh` | `boolean` | `true` | Resolve the auth state when the app mounts and refresh once after an API call returns 401. |
| `rotationEnabled` | `boolean` | `true` | Enable automatic refresh token rotation |
| `cookie.cookieName` | `string` | `'nuxt-aegis-refresh'` | Refresh token cookie name |
| `cookie.maxAge` | `number` | `604800` | Cookie max age in seconds (7 days) |
| `cookie.httpOnly` | `boolean` | `true` | HTTP-only flag for security |
| `cookie.secure` | `boolean` | `true` | Secure flag (HTTPS only) |
| `cookie.sameSite` | `'lax' \| 'strict' \| 'none'` | `'lax'` | SameSite cookie attribute |
| `encryption.enabled` | `boolean` | `false` | Encrypt stored refresh token records at rest |
| `encryption.key` | `string` | - | Encryption key (at least 32 characters; only the first 32 are used, shorter keys are padded with `0`) |
| `encryption.algorithm` | `'aes-256-gcm'` | `'aes-256-gcm'` | Encryption algorithm |
| `storage.driver` | `'fs' \| 'redis' \| 'memory'` | `'fs'` | Storage backend driver |
| `storage.base` | `string` | `'./.data/refresh-tokens'` | Base path for filesystem storage. With `redis`, the driver uses it as a key prefix, so set your own value (see [Redis storage](/configuration/storage#redis-storage)) |
| `storage.prefix` | `string` | `'refresh:'` | Reserved. It is not applied to storage keys |

::: tip Token Rotation
When `rotationEnabled: true` (default), refresh tokens are automatically replaced on every use for maximum security. Set to `false` for fixed-duration sessions. See [Token Refresh Guide](/guides/token-refresh#token-rotation) for details.
:::

::: tip Production Storage
In production, use Redis or another shared database driver for refresh token storage. Do not use the filesystem or memory drivers.
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
| `logout` | `string` | `'/'` | Redirect after logout |
| `success` | `string` | `'/'` | Redirect after successful auth |
| `error` | `string` | `'/'` | Redirect on auth error |

::: tip Security
All redirect URLs must be relative paths starting with `/` to prevent open redirect vulnerabilities.
:::

## Route Protection Configuration

Configure server-side and client-side route protection.

### Server-Side Protection (Nitro Route Rules)

Use Nitro's `routeRules` to protect server API routes:

```typescript
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      '/api/**': { nuxtAegis: { auth: true } },
      '/api/public/**': { nuxtAegis: { auth: false } },
    },
  },
})
```

**Authentication Values:**
- `true` | `'required'` | `'protected'` - Route requires authentication
- `false` | `'public'` | `'skip'` - Route is public and skips authentication
- `undefined` - Route is not protected (opt-in behavior)

::: tip Route Matching Precedence
Nitro matches routes by specificity. More specific patterns take precedence over less specific ones.
:::

::: warning Auth paths are not protected by route rules
The auth middleware skips `endpoints.authPath` (default `/auth`) and every path below it, such as `/auth/login`. Route rules for these paths have no effect. Keep your own protected routes outside `authPath`.
:::

### Client-Side Protection (Middleware)

Enable built-in client-side middleware for page protection:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable built-in client middleware |
| `global` | `boolean` | `false` | Apply `auth-logged-in` middleware globally |
| `redirectTo` | `string` | `'/login'` | Redirect destination for unauthenticated users |
| `loggedOutRedirectTo` | `string` | `'/'` | Redirect destination for authenticated users on logged-out pages |
| `publicRoutes` | `string[]` | `[]` | Routes to exclude from protection (glob patterns supported) |

**Built-in Middlewares:**
- `auth-logged-in` - Redirects unauthenticated users
- `auth-logged-out` - Redirects authenticated users (for login/register pages)

::: warning Security Notice
Client-side middleware improves UX but can be bypassed. Always use server-side protection via Nitro routeRules for API routes.
:::

## Endpoint Configuration

Customize the API endpoint paths used by Nuxt Aegis.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `authPath` | `string` | `'/auth'` | Base path for authentication routes |
| `loginPath` | `string` | `'/auth'` | Base path for login endpoints (provider appended as `[loginPath]/[provider]`) |
| `callbackPath` | `string` | `'/auth/callback'` | OAuth callback endpoint path |
| `logoutPath` | `string` | `'/auth/logout'` | Logout endpoint path |
| `refreshPath` | `string` | `'/auth/refresh'` | Token refresh endpoint path |
| `userInfoPath` | `string` | `'/api/user/me'` | User info endpoint path |

::: tip Custom Paths
You can customize these paths to match your application's routing structure. For example:

```typescript
endpoints: {
  loginPath: '/api/login',      // Login URLs become /api/login/google, /api/login/github, etc.
  logoutPath: '/api/logout',
  refreshPath: '/api/token/refresh',
}
```
:::

## Impersonation Configuration

Configure the user impersonation feature.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable user impersonation feature |
| `tokenExpiration` | `number` | `900` | Impersonation token expiration in seconds (15 mins) |
| `originalUserLookupClaim` | `string` | `'sub'` | Token claim used to restore the original user through `impersonation.fetchTarget()` |

::: warning Security Implication
Impersonation is a powerful feature. Ensure only authorized administrators can access the impersonation endpoints.
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
      // The secret is read from NUXT_NUXT_AEGIS_TOKEN_SECRET at runtime
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
      // The secret is read from NUXT_NUXT_AEGIS_TOKEN_SECRET at runtime
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
        // The key is read from NUXT_NUXT_AEGIS_TOKEN_REFRESH_ENCRYPTION_KEY at runtime
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
