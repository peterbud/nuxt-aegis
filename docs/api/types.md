# TypeScript Types

TypeScript type definitions and interfaces for Nuxt Aegis.

## User Types

### `User`

Authenticated user object from JWT token.

```typescript
interface User {
  sub: string          // Unique user identifier
  name: string         // Full display name
  email: string        // Email address
  picture?: string     // Profile picture URL
  provider: string     // OAuth provider ('google', 'auth0', 'github', 'mock')
  iat: number          // Token issued at (Unix timestamp)
  exp: number          // Token expires at (Unix timestamp)
  [key: string]: any   // Custom claims
}
```

## Configuration Types

### `NuxtAegisConfig`

Main configuration object for the module.

```typescript
interface NuxtAegisConfig {
  token?: TokenConfig
  tokenRefresh?: TokenRefreshConfig
  authCode?: AuthCodeConfig
  redirect?: RedirectConfig
  routeProtection?: RouteProtectionConfig
  endpoints?: EndpointsConfig
  providers?: ProvidersConfig
}
```

### `TokenConfig`

JWT token configuration.

```typescript
interface TokenConfig {
  secret: string                      // JWT signing secret (required)
  expiresIn?: string | number         // Token expiration (default: '1h')
  algorithm?: 'HS256' | 'RS256'       // Signing algorithm (default: 'HS256')
  issuer?: string                     // Token issuer (default: 'nuxt-aegis')
  audience?: string                   // Token audience (default: '')
}
```

### `TokenRefreshConfig`

Token refresh configuration.

```typescript
interface TokenRefreshConfig {
  enabled?: boolean                   // Enable refresh tokens (default: true)
  automaticRefresh?: boolean          // Auto-refresh on startup (default: true)
  cookie?: CookieConfig               // Refresh token cookie settings
  storage?: StorageConfig             // Persistent storage settings
  encryption?: EncryptionConfig       // Encryption at rest settings
}
```

### `CookieConfig`

Refresh token cookie configuration.

```typescript
interface CookieConfig {
  cookieName?: string                 // Cookie name (default: 'nuxt-aegis-refresh')
  maxAge?: number                     // Cookie max age in seconds (default: 604800 - 7 days)
  secure?: boolean                    // HTTPS only (default: true)
  httpOnly?: boolean                  // Not accessible to JavaScript (default: true)
  sameSite?: 'lax' | 'strict' | 'none' // SameSite attribute (default: 'lax')
  path?: string                       // Cookie path (default: '/')
}
```

### `StorageConfig`

Storage backend configuration.

```typescript
interface StorageConfig {
  driver?: 'fs' | 'redis' | 'memory'  // Storage driver (default: 'fs')
  prefix?: string                     // Key prefix (default: 'refresh:')
  base?: string                       // Base path for fs driver (default: './.data/refresh-tokens')
}
```

### `EncryptionConfig`

Encryption at rest configuration.

```typescript
interface EncryptionConfig {
  enabled?: boolean                   // Enable encryption (default: false)
  key?: string                        // Encryption key (32+ characters)
  algorithm?: 'aes-256-gcm'           // Encryption algorithm (default: 'aes-256-gcm')
}
```

### `AuthCodeConfig`

Authorization CODE configuration.

```typescript
interface AuthCodeConfig {
  expiresIn?: number                  // CODE expiration in seconds (default: 60)
}
```

### `RedirectConfig`

Redirect URL configuration.

```typescript
interface RedirectConfig {
  login?: string                      // Redirect after login (default: '/')
  logout?: string                     // Redirect after logout (default: '/')
  success?: string                    // Redirect after success (default: '/')
  error?: string                      // Redirect on error (default: '/auth/error')
}
```

### `RouteProtectionConfig`

Route protection configuration.

```typescript
interface RouteProtectionConfig {
  protectedRoutes?: string[]          // Routes requiring authentication (default: [])
  publicRoutes?: string[]             // Routes bypassing authentication (default: [])
}
```

### `ProvidersConfig`

OAuth providers configuration.

```typescript
interface ProvidersConfig {
  google?: GoogleProviderConfig
  auth0?: Auth0ProviderConfig
  github?: GitHubProviderConfig
  mock?: MockProviderConfig
}
```

## Provider Types

### `GoogleProviderConfig`

Google OAuth configuration.

```typescript
interface GoogleProviderConfig {
  clientId: string                    // Google client ID
  clientSecret: string                // Google client secret
  scopes?: string[]                   // OAuth scopes (default: ['openid', 'email', 'profile'])
  authorizationParams?: Record<string, string> // Custom authorization parameters
}
```

### `Auth0ProviderConfig`

Auth0 configuration.

```typescript
interface Auth0ProviderConfig {
  domain: string                      // Auth0 domain (e.g., 'tenant.auth0.com')
  clientId: string                    // Auth0 client ID
  clientSecret: string                // Auth0 client secret
  audience?: string                   // API audience
  scopes?: string[]                   // OAuth scopes (default: ['openid', 'email', 'profile'])
  authorizationParams?: Record<string, string> // Custom authorization parameters
}
```

### `GitHubProviderConfig`

GitHub OAuth configuration.

```typescript
interface GitHubProviderConfig {
  clientId: string                    // GitHub client ID
  clientSecret: string                // GitHub client secret
  scopes?: string[]                   // OAuth scopes (default: ['user:email', 'read:user'])
  authorizationParams?: Record<string, string> // Custom authorization parameters
}
```

### `MockProviderConfig`

Mock provider configuration.

```typescript
interface MockProviderConfig {
  clientId: string                    // Mock client ID (can be any string)
  clientSecret: string                // Mock client secret (can be any string)
  mockUsers: MockUser[]               // Mock user personas (required)
  defaultUser?: number                // Default user index (default: 0)
  enableInProduction?: boolean        // Allow in production (default: false, NOT RECOMMENDED)
}
```

### `MockUser`

Mock user persona.

```typescript
interface MockUser {
  sub: string                         // Unique user ID (required)
  email: string                       // Email address (required)
  name: string                        // Full name (required)
  picture?: string                    // Profile picture URL
  [key: string]: any                  // Custom claims
}
```

## Callback Types

### `CustomClaimsCallback`

Callback for generating dynamic custom claims.

```typescript
type CustomClaimsCallback = (
  user: Record<string, unknown>,
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
) => Record<string, unknown> | Promise<Record<string, unknown>>
```

### `UserInfoCallback`

Callback for transforming user info.

```typescript
type UserInfoCallback = (
  user: Record<string, unknown>,
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  },
  event: H3Event
) => Record<string, unknown> | Promise<Record<string, unknown>>
```

### `SuccessCallback`

Callback for handling successful authentication.

```typescript
type SuccessCallback = (payload: {
  user: Record<string, unknown>
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string
  event: H3Event
}) => void | Promise<void>
```

## Composable Types

### `UseAuthReturn`

Return type of `useAuth()` composable.

```typescript
interface UseAuthReturn<TUser = User> {
  user: Ref<TUser | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
  login: (provider: string, options?: LoginOptions) => Promise<void>
  logout: (options?: LogoutOptions) => Promise<void>
  refresh: () => Promise<void>
}
```

### `LoginOptions`

Login method options.

```typescript
interface LoginOptions {
  redirect?: string                   // Custom redirect URL after login
  authorizationParams?: Record<string, string> // Custom OAuth parameters
}
```

### `LogoutOptions`

Logout method options.

```typescript
interface LogoutOptions {
  redirect?: string                   // Custom redirect URL after logout
}
```

## Event Handler Types

### `OAuthEventHandlerConfig`

Configuration for OAuth event handlers.

```typescript
interface OAuthEventHandlerConfig {
  config?: {
    clientId?: string
    clientSecret?: string
    scope?: string[]
    authorizationParams?: Record<string, string>
    // ... provider-specific options
  }
  customClaims?: Record<string, unknown> | CustomClaimsCallback
  onUserInfo?: UserInfoCallback
  onSuccess?: SuccessCallback
}
```

## Hook Types

### `UserInfoHookPayload`

Payload for `nuxt-aegis:userInfo` hook.

```typescript
interface UserInfoHookPayload {
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
```

### `SuccessHookPayload`

Payload for `nuxt-aegis:success` hook.

```typescript
interface SuccessHookPayload {
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
```

## Usage Examples

### Custom User Type

```typescript
// types/auth.ts
export interface AppUser extends User {
  role: 'admin' | 'user' | 'guest'
  permissions: string[]
  organizationId: string
  premium: boolean
}

// Component
const { user } = useAuth<AppUser>()

if (user.value?.role === 'admin') {
  // Admin-specific logic
}
```

### Typed Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!,
      expiresIn: '1h',
      algorithm: 'HS256',
    } as TokenConfig,
    
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['openid', 'email', 'profile'],
      } as GoogleProviderConfig,
    },
  } as NuxtAegisConfig,
})
```

### Typed Custom Claims

```typescript
// server/routes/auth/google.get.ts
interface CustomClaims {
  role: 'admin' | 'user'
  premium: boolean
  organizationId: string
}

export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens): Promise<CustomClaims> => {
    const profile = await db.users.findUnique({
      where: { email: user.email },
    })
    
    return {
      role: profile?.role || 'user',
      premium: profile?.premium || false,
      organizationId: profile?.organizationId || '',
    }
  },
})
```

## Related

- [Configuration Reference](/configuration/)
- [API Reference](/api/)
- [Provider Configuration](/providers/)
