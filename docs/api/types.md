# TypeScript Types

TypeScript type definitions and interfaces for Nuxt Aegis.

## Importing Types

All types are available from the `#nuxt-aegis` module:

```typescript
import type {
  // Token/Payload Types
  BaseTokenClaims,
  CustomTokenClaims,
  ExtractClaims,
  ImpersonationContext,
  JSONValue,
  
  // Response Types
  RefreshResponse,
  TokenExchangeResponse,
  
  // Callback Types
  OnError,
  OnUserInfo,
  OnSuccess,
  OnSuccessParams,
  CustomClaimsCallback,
  
  // Handler Types
  AegisHandler,
  PasswordUser,
  
  // Hook Types
  UserInfoHookPayload,
  SuccessHookPayload,
  ImpersonateCheckPayload,
  ImpersonateFetchTargetPayload,
  ImpersonateStartPayload,
  ImpersonateEndPayload,
  
  // Configuration Types
  ModuleOptions,
  TokenConfig,
  TokenRefreshConfig,
  CookieConfig,
  EncryptionConfig,
  StorageConfig,
  RedirectConfig,
  EndpointConfig,
  ClientMiddlewareConfig,
  LoggingConfig,
  ImpersonationConfig,
  AuthCodeConfig,
  ClaimsValidationConfig,
  
  // Provider Configuration
  OAuthConfig,
  OAuthProviderConfig,
  GoogleProviderConfig,
  MicrosoftProviderConfig,
  GithubProviderConfig,
  Auth0ProviderConfig,
  MockProviderConfig,
  PasswordProviderConfig,
  CustomProviderConfig,
  
  // Route Protection
  NitroAegisAuth,
  NuxtAegisRouteRules,
} from '#nuxt-aegis'
```

---

## Token & Payload Types

::: info Understanding Token Claims
Nuxt Aegis uses two key concepts:
- **BaseTokenClaims**: Standard JWT claims (sub, email, name, iss, exp, etc.) that are always present
- **CustomTokenClaims<T>**: Combines BaseTokenClaims with your application-specific claims (role, permissions, etc.)

This naming makes the relationship clear: your custom token type extends the base claims.
:::

::: info Deprecated: User Type
The `User` type is deprecated. Use `BaseTokenClaims` or `CustomTokenClaims<T>` instead for better type safety and clarity.
:::

### `BaseTokenClaims`

Base JWT token claims interface representing standard JWT fields. This defines the foundation that all tokens have, whether you add custom claims or not.

```typescript
interface BaseTokenClaims {
  sub: string                           // Subject identifier (user ID) - required
  email?: string                        // User email address
  name?: string                         // User full name
  picture?: string                      // Profile picture URL
  provider?: string                     // Provider name (e.g., 'google', 'github')
  iss?: string                          // Issuer claim
  aud?: string | string[]               // Audience claim
  iat?: number                          // Issued at timestamp
  exp?: number                          // Expiration timestamp
  impersonation?: ImpersonationContext  // Impersonation context if active
  [key: string]: unknown                // Allows for custom claims via intersection
}
```

**When to use `BaseTokenClaims`:**
- When you only need standard JWT fields without custom claims
- As the base for creating custom token types with `CustomTokenClaims<T>`
- For generic authentication utilities that work with any token

**Usage:**

```typescript
import type { BaseTokenClaims } from '#nuxt-aegis'

// Use directly if you don't have custom claims
const { user } = useAuth<BaseTokenClaims>()

// Most applications will use CustomTokenClaims instead
type AppUser = CustomTokenClaims<{ role: string }>
```

### `CustomTokenClaims<T>`

Helper type for creating type-safe custom token payloads. This is what you'll use in your application to define your token structure with both standard JWT fields and your custom claims.

**The relationship:**
```typescript
// BaseTokenClaims: sub, email, name, iss, exp, etc.
// CustomTokenClaims<T>: BaseTokenClaims + your custom claims
type CustomTokenClaims<T extends Record<string, JSONValue>> = BaseTokenClaims & T
```

**Usage:**

```typescript
import type { CustomTokenClaims } from '#nuxt-aegis'

// Define your app's token type with both base and custom claims
export type AppTokenClaims = CustomTokenClaims<{
  role: 'admin' | 'user' | 'guest'  // Your custom claims
  permissions: string[]
  organizationId: string
}>

// Now AppTokenClaims includes:
// - Base claims: sub, email, name, iss, exp, etc.
// - Custom claims: role, permissions, organizationId

// Use in components - access both base and custom claims
const { user } = useAuth<AppTokenClaims>()
console.log(user.value?.email)  // Base claim - type-safe
console.log(user.value?.role)   // Custom claim - type-safe

// Use in server handlers
const user = getAuthUser<AppTokenClaims>(event)
if (user.role === 'admin') {
  // Admin logic
}
```

**Type constraint:** `T` must only contain JSON-serializable values (strings, numbers, booleans, arrays, or one-level objects).

::: tip Complete Guide
See the [Token Types guide](/guides/types/token-types.md) for comprehensive examples and best practices.
:::

### `ExtractClaims<T>`

Utility type to extract only custom claims from a token payload, removing all BaseTokenClaims fields.

```typescript
type ExtractClaims<T extends BaseTokenClaims> = Omit<T, keyof BaseTokenClaims>
```

**Usage:**

```typescript
import type { CustomTokenClaims, ExtractClaims } from '#nuxt-aegis'

type AppTokenClaims = CustomTokenClaims<{
  role: string
  permissions: string[]
}>

// Extract only custom claims
type CustomClaims = ExtractClaims<AppTokenClaims>
// Result: { role: string; permissions: string[] }

// Use in database operations
function updateUserClaims(userId: string, claims: ExtractClaims<AppTokenClaims>) {
  // Only accepts custom claims, not standard JWT fields
  await db.update({ role: claims.role, permissions: claims.permissions })
}
```

### `JSONValue`

Type representing JSON-serializable values for token payloads.

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }
```

::: warning Token Size
JWT tokens are sent with every request. Keep custom claims small (< 1KB recommended).
Nuxt Aegis will warn in development mode if token payload exceeds 1KB.
:::

### `ImpersonationContext`

Context information stored in JWT when a user is impersonating another user.

```typescript
interface ImpersonationContext {
  originalUserId: string                // Original user ID performing impersonation
  originalUserEmail?: string            // Original user email
  originalUserName?: string             // Original user name
  impersonatedAt: string                // Timestamp when impersonation started
  reason?: string                       // Reason for impersonation
  originalClaims?: Record<string, unknown>  // Original user's complete claims for restoration
}
```

**Usage:**

```typescript
const user = getAuthUser(event)

if (user.impersonation) {
  console.log(`User ${user.impersonation.originalUserId} is impersonating ${user.sub}`)
  console.log(`Reason: ${user.impersonation.reason}`)
}
```

## Response Types

### `RefreshResponse`

Response from token refresh operations.

```typescript
interface RefreshResponse {
  success: boolean      // Whether the refresh was successful
  message: string       // Status message
  accessToken?: string  // New JWT access token (if successful)
}
```

**Usage:**

```typescript
// Client-side refresh
const response = await $fetch<RefreshResponse>('/auth/refresh', { method: 'POST' })
if (response.success) {
  console.log('Token refreshed successfully')
}
```

### `TokenExchangeResponse`

Response from authorization code token exchange.

```typescript
interface TokenExchangeResponse {
  accessToken: string   // JWT access token for API authentication
  tokenType: 'Bearer'   // Token type (always "Bearer")
}
```

**Usage:**

```typescript
// Exchange authorization code for tokens
const response = await $fetch<TokenExchangeResponse>('/auth/token', {
  method: 'POST',
  body: { code: authorizationCode }
})
console.log('Received access token:', response.accessToken)
```

## Handler Types

### `AegisHandler`

Main handler interface for customizing Nuxt Aegis behavior via `defineAegisHandler`.

```typescript
interface AegisHandler {
  onUserInfo?: (payload: UserInfoHookPayload) => 
    Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined
  
  onUserPersist?: (user: Record<string, unknown>, context: UserPersistContext) =>
    Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined
  
  customClaims?: (user: Record<string, unknown>) =>
    Promise<Record<string, JSONValue>> | Record<string, JSONValue>
  
  password?: {
    findUser: (email: string) => Promise<PasswordUser | null> | PasswordUser | null
    sendVerificationCode: (email: string, code: string, action: 'register' | 'login' | 'reset') => 
      Promise<void> | void
    validatePassword?: (password: string) => Promise<boolean | string[]> | boolean | string[]
    hashPassword?: (password: string) => Promise<string> | string
    verifyPassword?: (password: string, hash: string) => Promise<boolean> | boolean
  }
  
  impersonation?: {
    fetchTarget: (targetId: string, event: H3Event) => 
      Promise<Record<string, unknown> | null> | Record<string, unknown> | null
    canImpersonate?: (requester: BaseTokenClaims, targetId: string, event: H3Event) => 
      Promise<boolean> | boolean
  }
}
```

**Key Handlers:**

- **`onUserInfo`**: Transform provider data after authentication (see [Handlers guide](/guides/handlers.md#onuserinfo))
- **`onUserPersist`**: Persist user to database and enrich user data (see [Handlers guide](/guides/handlers.md#onuserpersist))
- **`customClaims`**: Global fallback for adding JWT claims (see [Custom Claims guide](/guides/custom-claims.md#handler-level-claims))

**Usage:**

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin(() => {
  defineAegisHandler({
    // Unified database persistence for all auth methods
    onUserPersist: async (user, { provider }) => {
      if (provider === 'password') {
        const dbUser = await db.users.upsert({
          where: { email: user.email },
          update: { hashedPassword: user.hashedPassword },
          create: { email: user.email, hashedPassword: user.hashedPassword, role: 'user' }
        })
        return { userId: dbUser.id, role: dbUser.role }
      }
      // Handle OAuth providers...
    },
    
    // Global custom claims
    customClaims: async (user) => {
      const dbUser = await db.users.findUnique({ where: { id: user.userId } })
      return { 
        role: dbUser.role,
        permissions: dbUser.permissions 
      }
    },
    
    password: {
      findUser: async (email) => {
        return await db.users.findUnique({ where: { email } })
      },
      sendVerificationCode: async (email, code, action) => {
        await sendEmail({ to: email, subject: `Verification code: ${code}` })
      }
    }
  })
})
```

::: tip Complete Guide
See the [Handlers guide](/guides/handlers.md) for comprehensive examples.
:::

### `UserPersistContext`

Context object passed to the `onUserPersist` handler.

```typescript
interface UserPersistContext {
  provider: string    // Provider name (e.g., 'google', 'password', 'github')
  event: H3Event      // H3 event for server context
}
```

**Usage:**

```typescript
onUserPersist: async (user, { provider, event }) => {
  if (provider === 'password') {
    // Handle password authentication
  } else {
    // Handle OAuth providers
  }
}
```

### `PasswordUser`

User interface for password provider authentication.

```typescript
interface PasswordUser {
  id?: string                  // User ID (optional)
  email: string                // User email
  hashedPassword: string       // Hashed password
  [key: string]: unknown       // Additional user properties
}
```

**Usage:**

```typescript
const user: PasswordUser = {
  id: '123',
  email: 'user@example.com',
  hashedPassword: await hashPassword('secret'),
  role: 'user',
  createdAt: new Date()
}
```

## Hook Payload Types

### `ImpersonateCheckPayload`

Payload for `nuxt-aegis:impersonate:check` hook.

```typescript
interface ImpersonateCheckPayload {
  requester: BaseTokenClaims      // User requesting impersonation
  targetUserId: string         // Target user ID to impersonate
  reason?: string              // Reason for impersonation (for audit)
  event: H3Event               // H3 event for server context
  ip: string                   // Client IP address (for audit)
  userAgent: string            // User agent string (for audit)
}
```

### `ImpersonateFetchTargetPayload`

Payload for `nuxt-aegis:impersonate:fetchTarget` hook.

```typescript
interface ImpersonateFetchTargetPayload {
  requester: BaseTokenClaims      // User requesting impersonation
  targetUserId: string         // Target user ID to impersonate
  event: H3Event               // H3 event for server context
}
```

### `ImpersonateStartPayload`

Payload for `nuxt-aegis:impersonate:start` hook (audit logging).

```typescript
interface ImpersonateStartPayload {
  requester: BaseTokenClaims      // User who initiated impersonation
  targetUser: BaseTokenClaims     // Impersonated user
  reason?: string              // Reason for impersonation
  event: H3Event               // H3 event for server context
  ip: string                   // Client IP address (for audit)
  userAgent: string            // User agent string (for audit)
  timestamp: Date              // Timestamp of impersonation
}
```

### `ImpersonateEndPayload`

Payload for `nuxt-aegis:impersonate:end` hook (audit logging).

```typescript
interface ImpersonateEndPayload {
  restoredUser: BaseTokenClaims   // Restored original user
  impersonatedUser: BaseTokenClaims  // User who was being impersonated
  event: H3Event               // H3 event for server context
  ip: string                   // Client IP address (for audit)
  userAgent: string            // User agent string (for audit)
  timestamp: Date              // Timestamp when impersonation ended
}
```

::: tip Impersonation Hooks
See the [Impersonation guide](/guides/impersonation.md) for complete examples of using impersonation hooks.
:::

## Configuration Types

### `NuxtAegisConfig`

Main configuration object for the module.

```typescript
interface NuxtAegisConfig {
  token?: TokenConfig
  tokenRefresh?: TokenRefreshConfig
  authCode?: AuthCodeConfig
  redirect?: RedirectConfig
  clientMiddleware?: ClientMiddlewareConfig
  endpoints?: EndpointsConfig
  providers?: ProvidersConfig
  logging?: LoggingConfig
  impersonation?: ImpersonationConfig
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
  logout?: string                     // Redirect after logout (default: '/')
  success?: string                    // Redirect after success (default: '/')
  error?: string                      // Redirect on error (default: '/')
}
```

::: tip Security
All redirect URLs must be relative paths (e.g., `/dashboard`) to prevent open redirect attacks.
:::

### `ClientMiddlewareConfig`

Client-side middleware configuration for route protection.

```typescript
interface ClientMiddlewareConfig {
  enabled: boolean                    // Enable client-side route protection (default: false)
  global?: boolean                    // Register globally for all routes (default: false)
  redirectTo: string                  // Redirect for unauthenticated users (required when enabled)
  loggedOutRedirectTo: string         // Redirect for authenticated users on logged-out pages (required)
  publicRoutes?: string[]             // Route patterns excluded from auth (glob patterns supported)
}
```

::: tip Route Protection
For server-side route protection, use Nitro route rules with the `auth` property:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      '/admin/**': { nuxtAegis: { auth: true } },
      '/api/public/**': { nuxtAegis: { auth: false } },
    }
  }
})
```
:::

### `NitroAegisAuth`

Authentication requirement for Nitro route rules.

```typescript
type NitroAegisAuth = boolean | 'required' | 'protected' | 'public' | 'skip'
```

**Values:**
- `true`, `'required'`, or `'protected'`: Route requires authentication
- `false`, `'public'`, or `'skip'`: Route is public and skips authentication

### `NuxtAegisRouteRules`

Nuxt Aegis route rules configuration.

```typescript
interface NuxtAegisRouteRules {
  auth?: NitroAegisAuth
}
```

### `EndpointConfig`

API endpoint path configuration.

```typescript
interface EndpointConfig {
  authPath?: string                   // Base path for auth routes (default: '/auth')
  loginPath?: string                  // Base path for login endpoints (default: '/auth')
                                      // Login URLs constructed as: [loginPath]/[provider]
  callbackPath?: string               // OAuth callback path (default: '/auth/callback')
  logoutPath?: string                 // Logout endpoint path (default: '/auth/logout')
  refreshPath?: string                // Token refresh path (default: '/auth/refresh')
  userInfoPath?: string               // User info endpoint (default: '/api/user/me')
}
```

::: tip Custom Endpoint Paths
Customize endpoint paths to match your application's routing:

```typescript
endpoints: {
  loginPath: '/api/login',      // Login: /api/login/google
  logoutPath: '/api/logout',
  refreshPath: '/api/token/refresh',
}
```
:::

### `LoggingConfig`

Logging configuration.

```typescript
interface LoggingConfig {
  level?: 'silent' | 'error' | 'warn' | 'info' | 'debug'  // Log level (default: 'info')
  security?: boolean                  // Enable security event logging (default: false)
}
```

### `ImpersonationConfig`

Impersonation configuration.

```typescript
interface ImpersonationConfig {
  enabled?: boolean                   // Enable user impersonation (default: false, opt-in)
  tokenExpiration?: number            // Token expiration for impersonated sessions in seconds (default: 900)
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

### `OAuthConfig<T>`

Generic OAuth provider configuration wrapper used by all provider event handlers.

```typescript
interface OAuthConfig<T extends OAuthProviderConfig> {
  config?: T                          // Provider-specific configuration
  customClaims?: Record<string, unknown> | CustomClaimsCallback  // Static or dynamic custom claims
  onUserInfo?: OnUserInfo             // Transform user info callback
  onSuccess?: OnSuccess               // Success callback
  onError?: OnError                   // Error callback
}
```

**Usage:**

```typescript
import type { OAuthConfig, GoogleProviderConfig } from '#nuxt-aegis'

export default defineOAuthGoogleEventHandler({
  config: {
    clientId: '...',
    clientSecret: '...',
  },
  customClaims: { role: 'user' },
} as OAuthConfig<GoogleProviderConfig>)
```

### `OAuthProviderConfig`

Base OAuth provider configuration interface.

```typescript
interface OAuthProviderConfig {
  clientId: string                    // OAuth client ID
  clientSecret: string                // OAuth client secret
  scopes?: string[]                   // OAuth scopes
  authorizationParams?: Record<string, string>  // Custom authorization parameters
}
```

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

### `MicrosoftProviderConfig`

Microsoft OAuth configuration.

```typescript
interface MicrosoftProviderConfig {
  clientId: string                    // Microsoft client ID
  clientSecret: string                // Microsoft client secret
  tenant?: string                     // Microsoft tenant ID (default: 'common')
  scopes?: string[]                   // OAuth scopes (default: ['openid', 'email', 'profile'])
  authorizationParams?: Record<string, string> // Custom authorization parameters
}
```

### `GithubProviderConfig`

GitHub OAuth configuration.

```typescript
interface GithubProviderConfig
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

### `PasswordProviderConfig`

Password provider configuration.

```typescript
interface PasswordProviderConfig {
  magicCodeTTL?: number              // Magic code time-to-live in seconds (default: 600 = 10 minutes)
  magicCodeMaxAttempts?: number      // Maximum verification attempts (default: 5)
  passwordHashRounds?: number        // Bcrypt hashing rounds (default: 12)
  passwordPolicy?: {
    minLength?: number               // Minimum password length (default: 8)
    requireUppercase?: boolean       // Require uppercase letter (default: true)
    requireLowercase?: boolean       // Require lowercase letter (default: true)
    requireNumber?: boolean          // Require number (default: true)
    requireSpecial?: boolean         // Require special character (default: false)
  }
}
```

::: tip Password Provider
See the [Password Authentication guide](/providers/password.md) for implementation details.
:::

### `CustomProviderConfig`

Custom OAuth provider configuration for implementing your own provider.

```typescript
interface CustomProviderConfig extends OAuthProviderConfig {
  name: string                       // Unique name identifier for the custom provider
}
```

::: tip Custom Providers
See the [Custom Provider guide](/providers/custom.md) for creating custom OAuth providers.
:::

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
