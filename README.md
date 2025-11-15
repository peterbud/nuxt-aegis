# Nuxt Aegis

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A comprehensive authentication and authorization module for Nuxt 3/4 applications that provides OAuth-based authentication with JWT token management, automatic token refresh, and flexible route protection.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📋 &nbsp;Requirements Specification](/specs/requirements.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-aegis?file=playground%2Fapp.vue) -->

## Features

- � **OAuth 2.0 & OpenID Connect** - Support for Google, Microsoft Entra ID, GitHub, and Auth0 providers
- 🎫 **JWT Token Management** - Automatic generation and validation of JSON Web Tokens (RFC 7519)
- 🔄 **Automatic Token Refresh** - Built-in token refresh with configurable expiration times
- 🛡️ **Route Protection** - Flexible middleware for protecting server and client routes with declarative configuration
- 🎨 **Custom Claims** - Add application-specific claims to JWT tokens
- 🍪 **Secure Cookie Management** - HTTP-only, secure cookies for refresh tokens
- ⚡ **SSR Ready** - TODO: Full server-side rendering support with state hydration
- 🔌 **Extensible Providers** - Easy to add custom OAuth providers
- 🥽 **Type Safe** - Written in TypeScript with full type definitions
- ⚒️ **Composable API** - Simple `useAuth()` composable for client-side authentication state

## Table of Contents

- [Quick Setup](#quick-setup)
- [Configuration](#configuration)
- [Authentication Providers](#authentication-providers)
- [Usage](#usage)
  - [Client-Side Authentication](#client-side-authentication)
  - [Server-Side Route Protection](#server-side-route-protection)
  - [Custom Claims](#custom-claims)
  - [Token Refresh](#token-refresh)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Security](#security)
- [Development](#development)
- [Advanced Topics](#advanced-topics)

## Quick Setup

1. Install the module to your Nuxt application:

```bash
npx nuxi module add nuxt-aegis
```

2. Configure the module in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-aegis'],
  
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!, // Required
      expiresIn: '1h',
      algorithm: 'HS256',
      issuer: 'https://myapp.com',
      audience: 'https://myapp.com/api',
    },
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  },
})
```

3. Set up your environment variables:

```bash
# Required: Secret for signing JWT tokens (32+ characters recommended)
NUXT_AEGIS_TOKEN_SECRET=your-super-secret-key-minimum-32-characters

# OAuth Provider Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Encryption key for refresh token storage (32+ characters)
NUXT_AEGIS_ENCRYPTION_KEY=your-encryption-key-minimum-32-characters
```

That's it! You can now use Nuxt Aegis in your Nuxt app ✨

## Configuration

### Complete Configuration Example

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

### Configuration Options

#### Token Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | - | **Required**. Secret key for signing JWTs |
| `expiresIn` | `string \| number` | `'1h'` | Access token expiration time |
| `algorithm` | `'HS256' \| 'RS256'` | `'HS256'` | JWT signing algorithm |
| `issuer` | `string` | `'nuxt-aegis'` | Token issuer claim |
| `audience` | `string` | `''` | Token audience claim |

#### Token Refresh Configuration

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
| `storage.prefix` | `string` | `'refresh:'` | Storage key prefix |
| `storage.base` | `string` | `'./.data/refresh-tokens'` | Base path for filesystem storage |

#### Authorization CODE Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `expiresIn` | `number` | `60` | CODE expiration time in seconds |

## Authentication Providers

Nuxt Aegis supports multiple OAuth providers out of the box.

### Google

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Optional: Custom authorization parameters
        authorizationParams: {
          access_type: 'offline',    // Request refresh token from Google
          prompt: 'consent',         // Force consent screen
        },
      },
    },
  },
})
```

**Server-side handler**:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
    // Optional: Custom authorization parameters (can also be set here)
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  // Add custom claims to the JWT
  customClaims: {
    role: 'user',
    permissions: ['read'],
  },
})
```

### Auth0

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      auth0: {
        clientId: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
        domain: process.env.AUTH0_DOMAIN!, // e.g., 'your-tenant.auth0.com'
        // Optional: Custom authorization parameters
        authorizationParams: {
          prompt: 'login',           // Force login screen
          screen_hint: 'signup',     // Show signup page instead of login
        },
      },
    },
  },
})
```

**Server-side handler**:

```typescript
// server/routes/auth/auth0.get.ts
export default defineOAuthAuth0EventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
    // Optional: Custom authorization parameters
    authorizationParams: {
      prompt: 'login',
    },
  },
  // Add custom claims to the JWT
  customClaims: {
    role: 'user',
    permissions: ['read'],
  },
})
```

**Environment variables**:

```bash
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com
```

### Custom Authorization Parameters

All OAuth providers support custom authorization parameters via the `authorizationParams` configuration option. These parameters are appended to the authorization URL when redirecting users to the OAuth provider.

**Security Note**: Critical OAuth parameters (`client_id`, `redirect_uri`, `code`, `grant_type`) are protected and cannot be overridden. If you attempt to override these, a warning will be logged and the parameters will be ignored.

#### Common Use Cases

**Google - Request Offline Access**:
```typescript
authorizationParams: {
  access_type: 'offline',  // Get refresh token
  prompt: 'consent',       // Force consent screen to ensure refresh token
}
```

**Google - Restrict to Domain**:
```typescript
authorizationParams: {
  hd: 'example.com',  // Only allow users from example.com Google Workspace
}
```

**Auth0 - Force Login**:
```typescript
authorizationParams: {
  prompt: 'login',         // Always show login screen
  screen_hint: 'signup',   // Show signup form instead of login
}
```

**GitHub - Allow Signup**:
```typescript
authorizationParams: {
  allow_signup: 'true',  // Allow users to create new accounts during OAuth flow
}
```

### Custom Provider

You can implement custom OAuth providers by extending the base provider:

```typescript
// server/utils/customProvider.ts
import { OAuthBaseProvider } from '#nuxt-aegis/server/providers'

export class CustomOAuthProvider extends OAuthBaseProvider {
  constructor(config) {
    super({
      name: 'custom',
      authorizationURL: 'https://provider.com/oauth/authorize',
      tokenURL: 'https://provider.com/oauth/token',
      userInfoURL: 'https://provider.com/oauth/userinfo',
      ...config,
    })
  }
}
```

## Usage

### Client-Side Authentication

Use the `useAuth()` composable in your Vue components:

```vue
<script setup lang="ts">
const { isLoggedIn, isLoading, user, login, logout, refresh } = useAuth()
</script>

<template>
  <div>
    <div v-if="isLoading">
      Loading...
    </div>
    <div v-else-if="isLoggedIn">
      <p>Welcome, {{ user?.name }}!</p>
      <img :src="user?.picture" alt="Profile" />
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <button @click="login('google')">Login with Google</button>
    </div>
  </div>
</template>
```

#### useAuth() API

The `useAuth()` composable provides:

**Properties:**
- `isLoggedIn: Ref<boolean>` - Whether user is authenticated
- `isLoading: Ref<boolean>` - Whether auth state is loading
- `user: Ref<User | null>` - Current user data from JWT claims

**Methods:**
- `login(provider: string): Promise<void>` - Initiate OAuth login
- `logout(): Promise<void>` - End user session
- `refresh(): Promise<void>` - Manually refresh access token

### Server-Side Route Protection

Protect your API routes using the built-in middleware:

#### Route Protection Configuration

Configure which routes require authentication:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    routeProtection: {
      // These routes require authentication
      protectedRoutes: [
        '/api/user/**',
        '/api/admin/**',
        '/dashboard/**',
      ],
      // These routes are public (bypass auth)
      publicRoutes: [
        '/api/public/**',
        '/login',
        '/about',
      ],
    },
  },
})
```

**Note:** If a route matches both protected and public patterns, it's treated as public.

#### Protected Routes

When your routes are protected by the authentication middleware, you can avoid manual `null` checks for `event.context.user` by using the provided utility functions.

##### Using `getAuthUser()`

The simplest way to get the authenticated user in a protected route:

```typescript
export default defineEventHandler((event) => {
  // getAuthUser() ensures user is authenticated and returns the typed user object
  const user = getAuthUser(event)
  
  // TypeScript knows user is defined - no need for null checks
  return {
    userId: user.sub,
    email: user.email,
    name: user.name,
  }
})
```

##### Using `requireAuth()`

If you need the full event with narrowed type:

```typescript
export default defineEventHandler((event) => {
  // requireAuth() narrows the event type to guarantee user exists
  const authenticatedEvent = requireAuth(event)
  const { user } = authenticatedEvent.context
  
  // TypeScript knows user is defined
  return {
    userId: user.sub,
    email: user.email,
  }
})
```
##### How it Works

Both functions:
1. Check if `event.context.user` exists
2. Throw a `401 Unauthorized` error if not (this should never happen if middleware is configured correctly)
3. Narrow the TypeScript type so you don't need manual null checks

## Benefits

- **Type Safety**: TypeScript knows `user` is defined after calling these functions
- **Cleaner Code**: No need for manual `if (!user)` checks in every handler
- **Runtime Safety**: Provides a safety net even if middleware configuration changes
- **Better DX**: Auto-completion and type inference work perfectly

### Authorization CODE Flow

Nuxt Aegis implements an additional security layer with short-lived authorization CODEs between the OAuth callback and token exchange. This prevents token exposure in browser redirects.

#### How It Works

```
OAuth Provider → Server receives auth code
                  ↓
            Server exchanges for provider tokens
                  ↓
            Server retrieves user info
                  ↓
            Server generates authorization CODE (60s lifetime)
                  ↓
            Server stores CODE with user data in memory
                  ↓
            Server redirects to /auth/callback?code=CODE
                  ↓
            Client calls /auth/token with CODE
                  ↓
            Server validates CODE (single-use)
                  ↓
            Server generates JWT tokens
                  ↓
            Server returns access token to client
```

#### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    authCode: {
      expiresIn: 60, // CODE lifetime in seconds (default: 60)
    },
  },
})
```

#### Security Features

- ✅ **Short-lived**: 60-second expiration (configurable)
- ✅ **Single-use**: CODE deleted immediately after exchange
- ✅ **Cryptographically secure**: Generated using `crypto.randomBytes(32)`
- ✅ **Memory storage**: In-memory key-value store (not persistent)
- ✅ **Automatic cleanup**: Expired CODEs automatically removed
- ✅ **No token exposure**: Access tokens never appear in URL redirects

**Why use this approach?**
1. **Prevents URL token exposure**: Tokens never appear in browser history
2. **Reduced attack surface**: CODEs expire quickly and can't be reused
3. **Better security**: Server-side validation before token generation
4. **Single-use enforcement**: Prevents replay attacks

### Custom Claims

Add application-specific data to your JWT tokens. Custom claims can be static objects or dynamic callback functions that receive user and token data from the OAuth provider:

#### Static Custom Claims

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

#### Dynamic Custom Claims

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

#### Database Lookups

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

#### Using Custom Claims with Provider Tokens

When using a callback function, you can access both the user information and the OAuth provider tokens:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    // user: User information from the provider
    // tokens: { access_token, refresh_token, id_token, expires_in }
    
    // You can use the provider's access_token to fetch additional data
    const extraData = await $fetch('https://provider.com/api/extra', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    return {
      role: determineRole(user),
      extraInfo: extraData,
    }
  },
})
```

**Important**: During token refresh, the same custom claims callback is invoked with the stored user object to maintain consistency. The provider tokens are not available during refresh since we're not re-authenticating with the provider.

#### Supported Claim Types

- ✅ `string` - Text values
- ✅ `number` - Numeric values
- ✅ `boolean` - True/false values
- ✅ `Array<string | number | boolean>` - Arrays of primitives
- ✅ `null` - Null values
- ❌ Objects, functions, undefined (not allowed)

#### Reserved Claims

The following JWT claims are **reserved** and cannot be overridden:

`iss`, `sub`, `exp`, `iat`, `nbf`, `jti`, `aud`

If you attempt to override these claims, they will be filtered out and a warning will be logged.

### Authentication Hooks

Nuxt Aegis provides a powerful hooks system that allows you to customize authentication behavior globally via server plugins. This is the recommended way to define default authentication event handlers across all providers.

#### Available Hooks

##### `nuxt-aegis:userInfo`

Called after fetching user information from the OAuth provider, before storing it. Use this to:
- Normalize user data across different providers
- Add custom fields to all user objects
- Enrich user data from external sources (e.g., database lookup)

##### `nuxt-aegis:success`

Called after successful authentication. Use this to:
- Log authentication events
- Send analytics
- Save or update user records in your database
- Trigger notifications or webhooks

#### Defining Global Hooks

Create a server plugin to define global authentication hooks:

```typescript
// server/plugins/aegis.ts
export default defineNitroPlugin((nitroApp) => {
  // Transform user data globally
  nitroApp.hooks.hook('nuxt-aegis:userInfo', async (payload) => {
    console.log('User authenticated via', payload.provider)
    
    // Add custom fields to all users
    payload.user.authenticatedAt = new Date().toISOString()
    payload.user.authProvider = payload.provider
    
    // Normalize user ID across providers
    if (!payload.user.id && payload.user.sub) {
      payload.user.id = payload.user.sub
    }
    
    // Return the modified user object
    return payload.user
  })

  // Handle successful authentication globally
  nitroApp.hooks.hook('nuxt-aegis:success', async (payload) => {
    console.log('User authenticated:', payload.user.id)
    
    // Save to database
    await db.users.upsert({
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name,
      provider: payload.provider,
      lastLogin: new Date(),
    })
    
    // Send analytics
    await analytics.track('user_authenticated', {
      userId: payload.user.id,
      provider: payload.provider,
    })
  })
})
```

#### Hook Payloads

**UserInfo Hook Payload:**
```typescript
{
  user: Record<string, unknown>      // Raw user from provider
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string                   // 'google', 'github', etc.
  event: H3Event                     // Server event context
}
```

**Success Hook Payload:**
```typescript
{
  user: Record<string, unknown>      // Transformed user object
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string                   // 'google', 'github', etc.
  event: H3Event                     // Server event context
}
```

#### Provider-Level Overrides

Individual OAuth route handlers can still override these global hooks by providing their own `onUserInfo` or `onSuccess` callbacks:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
  },
  // This overrides the global nuxt-aegis:userInfo hook for Google only
  onUserInfo: async (user, tokens, event) => {
    // Google-specific user transformation
    user.customGoogleField = 'value'
    return user
  },
  // This runs BEFORE the global nuxt-aegis:success hook
  onSuccess: async ({ user, provider }) => {
    // Google-specific success logic
    console.log('Google login successful:', user.email)
  },
})
```

**Hook Execution Order:**

1. **userInfo transformation:**
   - If provider-level `onUserInfo` is defined → use it (global hook is skipped)
   - Otherwise → call global `nuxt-aegis:userInfo` hook

2. **Success handling:**
   - If provider-level `onSuccess` is defined → run it first
   - Then → always run global `nuxt-aegis:success` hook

This design allows provider-specific customization while maintaining global defaults.

### Token Refresh

Nuxt Aegis provides automatic token refresh to maintain user sessions without re-authentication.

#### How Token Refresh Works

1. **Initial Authentication**: After OAuth login, refresh token is stored server-side with user data
2. **Auto-Refresh on Startup**: When app initializes, and there is a valid refresh token cookie, it attempts to get new access token using refresh token cookie
3. **Expiration Handling**: When access token expires, client can request a new one (if it is enabled in the configuration)
4. **Token Generation**: Upon token refresh, the server retrieves stored user object and regenerates access token with same custom claims
5. **Optional Rotation**: Server can rotate (replace) the refresh token for additional security

#### Automatic Refresh

When enabled, tokens are automatically refreshed when expired:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true, // Refresh on app startup
    },
  },
})
```

The module automatically:
1. Attempts to refresh access token when app initializes (if refresh token cookie exists)
2. Handles access token expiration gracefully
3. Refreshes tokens when they have expired (if refresh token is still valid)
4. Retries failed API requests after token refresh
5. Prevents multiple simultaneous refresh requests

#### Refresh Token Storage

Refresh tokens are stored server-side in a **persistent storage layer** (survives server restarts):

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'fs', // Options: 'fs', 'redis'
        prefix: 'refresh:',
        base: './.data/refresh-tokens',
      },
    },
  },
})
```

**What's stored with each refresh token:**
- **Hashed token value** (SHA-256 hash used as storage key)
- **Complete user object** (all profile data from OAuth provider)
- **Subject identifier** (sub)
- **Expiration timestamp**
- **Revocation status** (for logout/invalidation)
- **Optional encrypted data** (if encryption enabled)

#### Encryption at Rest

Enable AES-256-GCM encryption for sensitive user data:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      encryption: {
        enabled: true,
        key: process.env.NUXT_AEGIS_ENCRYPTION_KEY, // 32+ characters
        algorithm: 'aes-256-gcm',
      },
    },
  },
})
```

**Environment variables:**
```bash
NUXT_AEGIS_ENCRYPTION_KEY=your-32-character-encryption-key-minimum
```

**Security features:**
- **AES-256-GCM** authenticated encryption
- **Random IV** (initialization vector) for each encryption
- **Transparent operation** (automatic encrypt/decrypt)
- **Storage protection** (protects against storage backend compromise)
- **Authentication tags** (prevents tampering)

**When to use encryption:**
- When storing sensitive user data (emails, names, etc.)
- When using shared storage backends (e.g., Redis)
- When compliance requires encryption at rest
- When storage backend is not fully trusted

#### Manual Refresh

You can manually refresh tokens using the composable:

```vue
<script setup lang="ts">
const { refresh } = useAuth()

async function refreshToken() {
  try {
    await refresh()
    console.log('Token refreshed successfully')
  } catch (error) {
    console.error('Token refresh failed', error)
  }
}
</script>
```

## API Endpoints

Nuxt Aegis automatically creates the following endpoints:

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/{provider}` | GET | Initiate OAuth login with provider (or handle OAuth callback) |
| `/auth/callback` | GET | Client-side callback page for CODE exchange |
| `/auth/token` | POST | Exchange authorization CODE for JWT tokens |
| `/auth/logout` | POST | End user session and revoke refresh token |
| `/auth/refresh` | POST | Refresh access token using refresh token cookie |
| `/api/user/me` | GET | Get current user info from JWT |

### Provider-Specific Endpoints

For each configured provider (e.g., Google), the module creates a dual-purpose endpoint:

- **Initial Login**: `GET /auth/google` (no code param) - Redirects to Google OAuth
- **OAuth Callback**: `GET /auth/google?code=...` - Handles OAuth callback and generates authorization CODE

### Using Endpoints

#### Login

```typescript
// Redirect user to login
navigateTo('/auth/google')

// Or use the composable
const { login } = useAuth()
await login('google')
```

#### Logout

```typescript
// Client-side
const { logout } = useAuth()
await logout()

// Or make a direct API call
await $fetch('/auth/logout', { method: 'POST' })
```

#### Get Current User

```typescript
// Server-side
const user = await $fetch('/api/user/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
})

// or use client side `useAuth()`composable
const { user } = useAuth()

```

#### Refresh Token

```typescript
const { token } = await $fetch('/auth/refresh', {
  method: 'POST'
  // Refresh token cookie is sent automatically
})
```

**How it works:**
1. Refresh token is sent automatically via HttpOnly cookie
2. Server validates token from persistent storage
3. Server retrieves stored user object
4. Server generates new access token with custom claims
5. Server optionally rotates refresh token
6. Server returns new access token in response

#### Token Exchange (CODE to JWT)

```typescript
// This is handled automatically by the client callback page
const { token } = await $fetch('/auth/token', {
  method: 'POST',
  body: {
    code: authorizationCode // From /auth/callback URL
  }
})
```

**Security features:**
- Single-use CODE enforcement (deleted after exchange)
- 60-second CODE expiration
- Cryptographically secure CODE generation

## Architecture

### Project Structure

```
src/
├── module.ts                          # Module entry point
├── runtime/
    ├── app/                           # Client-side code
    │   ├── composables/
    │   │   └── useAuth.ts             # Auth composable
    │   ├── pages/
    │   │   └── AuthCallback.vue       # OAuth callback page
    │   └── plugins/
    │       └── api.client.ts          # Auth state plugin
    ├── server/                        # Server-side code
    │   ├── middleware/
    │   │   └── auth.ts                # Route protection middleware
    │   ├── providers/
    │   │   ├── oauthBase.ts           # Base OAuth provider
    │   │   └── google.ts              # Google OAuth provider
    │   ├── routes/
    │   │   ├── logout.post.ts         # Logout endpoint
    │   │   ├── me.get.ts              # User info endpoint
    │   │   └── refresh.post.ts        # Token refresh endpoint
    │   └── utils/
    │       └── index.ts               # Token utilities
    └── types/
        └── index.ts                   # TypeScript definitions
```

### Authentication Flow

The module implements a secure OAuth 2.0 authorization code flow with an additional CODE exchange step:

```
1. User clicks "Login with Google"
   ↓
2. Client redirects to /auth/google (without code parameter)
   ↓
3. Server redirects to Google OAuth authorization page
   ↓
4. User authenticates with Google
   ↓
5. Google redirects back to /auth/google with authorization code
   ↓
6. Server exchanges authorization code for provider tokens
   ↓
7. Server retrieves user info from provider
   ↓
8. Server generates short-lived authorization CODE (60 seconds)
   ↓
9. Server stores CODE with user data in memory
   ↓
10. Server redirects to /auth/callback with CODE
    ↓
11. Client automatically calls /auth/token with CODE
    ↓
12. Server validates CODE (single-use enforcement)
    ↓
13. Server generates JWT access token with custom claims
    ↓
14. Server generates refresh token and stores it securely
    ↓
15. Server sets refresh token as HttpOnly, Secure cookie
    ↓
16. Server returns access token in JSON response
    ↓
17. Client stores access token in memory
    ↓
18. Client redirects to protected route or home page
```

### Token Management

#### Access Tokens
- **Storage**: In-memory (reactive reference variable), cleared on page refresh
- **Lifetime**: Short-lived (default: 1 hour, configurable via `token.expiresIn`)
- **Format**: JWT with standard claims (sub, iss, exp, iat) and configurable custom claims
- **Transport**: Sent via `Authorization: Bearer` header for API requests

#### Refresh Tokens
- **Storage**: Server-side persistent storage (Nitro storage layer)
- **Cookie**: Sent to client as HttpOnly, Secure cookie (not accessible to JavaScript)
- **Lifetime**: Long-lived (default: 7 days, configurable via `tokenRefresh.cookie.maxAge`)
- **Security**: Hashed using SHA-256 before storage, optionally encrypted at rest

#### Authorization CODEs
- **Storage**: Server-side in-memory store
- **Lifetime**: 60 seconds (configurable via `authCode.expiresIn`)
- **Purpose**: Securely bridge OAuth callback to token exchange
- **Security**: Single-use enforcement, cryptographically secure random generation

#### Token Refresh Process
1. Client detects expired access token or calls `refresh()` manually / automatically
2. Browser automatically sends refresh token cookie with request to `/auth/refresh`
3. Server validates refresh token (existence, expiration, revocation status)
4. Server retrieves stored user object from persistent storage
5. Server generates new access token with same custom claims logic
6. Server optionally rotates refresh token (generates new one)
7. Server returns new access token in JSON response
8. Client stores new access token in memory and updates authentication state

#### Storage Configuration

The module uses Nitro's storage layer for refresh tokens, supporting multiple backends:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'fs', // 'fs', 'redis', or 'memory'
        prefix: 'refresh:', // Storage key prefix
        base: './.data/refresh-tokens', // Base path for filesystem
      },
    },
  },
})
```

#### Encryption at Rest

For additional security, enable encryption for user data stored with refresh tokens:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      encryption: {
        enabled: true,
        key: process.env.NUXT_AEGIS_ENCRYPTION_KEY, // 32+ character key
        algorithm: 'aes-256-gcm', // AES-256-GCM encryption
      },
    },
  },
})
```

**Environment variables:**
```bash
NUXT_AEGIS_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Features:**
- AES-256-GCM authenticated encryption
- Random IV (initialization vector) for each encryption
- Transparent encryption/decryption in storage layer
- Protects user data if storage backend is compromised

## Security

Nuxt Aegis implements security best practices:

### Token Security

✅ **HTTP-Only Cookies** - Refresh tokens stored in HTTP-only cookies (not accessible via JavaScript)  
✅ **Secure Cookies** - Cookies only sent over HTTPS in production  
✅ **SameSite Protection** - CSRF protection via SameSite cookie attribute  
✅ **Short-lived Access Tokens** - Access tokens expire quickly (default: 1 hour)  
✅ **Token Rotation** - New refresh tokens issued on each refresh (optional)  
✅ **Hashed Storage** - Refresh tokens hashed (SHA-256) before storage  
✅ **Encryption at Rest** - Optional AES-256-GCM encryption for user data  
✅ **Authorization CODE** - Short-lived (60s) single-use CODEs prevent token exposure in URLs

### Storage Security

✅ **Persistent Storage** - Refresh tokens survive server restarts (Nitro storage layer)  
✅ **Hashed Keys** - Refresh tokens hashed before use as storage keys  
✅ **Encryption Support** - Optional AES-256-GCM encryption at rest  
✅ **Revocation** - Refresh tokens can be marked as revoked  
✅ **Automatic Cleanup** - Expired tokens automatically removed  
✅ **Multiple Backends** - Support for filesystem, Redis, memory, and more

### Transport Security

✅ **HTTPS Required** - Enforced in production environments  
✅ **No Token Exposure** - Access tokens never appear in URL redirects  
✅ **CODE-based Exchange** - OAuth callback uses short-lived CODEs instead of direct token URLs  
✅ **No Logging of Secrets** - Secrets never logged or exposed in errors

### Validation

✅ **Signature Verification** - All JWTs verified before use
✅ **Expiration Checking** - Expired tokens rejected automatically
✅ **Issuer Validation** - Token issuer validated against configuration
✅ **Audience Validation** - Token audience validated when configured

### Best Practices

1. **Use Strong Secrets** - Use cryptographically secure random strings (min 32 characters) for both token signing and encryption
2. **Environment Variables** - Never commit secrets to version control
3. **HTTPS Only** - Always use HTTPS in production
4. **Enable Encryption** - Enable encryption at rest for sensitive user data in production
5. **Persistent Storage** - Use Redis or database for refresh tokens in production (not in-memory)
6. **Token Expiration** - Balance security with user experience (1h access, 7d refresh recommended)
7. **Claim Validation** - Validate claims on the server side
8. **Minimal Claims** - Keep tokens small (avoid large custom claims)
9. **No Sensitive Data in JWTs** - Don't store highly sensitive data in JWTs (they're base64 encoded, not encrypted)
10. **Monitor Storage** - Implement automatic cleanup of expired refresh tokens

## Development

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/peterbud/nuxt-aegis.git
cd nuxt-aegis

# Install dependencies
pnpm install

# Generate type stubs
pnpm run dev:prepare

# Start development server with playground
pnpm run dev

# Build the playground
pnpm run dev:build
```

### Testing

```bash
# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Type checking
pnpm run test:types
```

### Linting

```bash
# Run ESLint
pnpm run lint

# Fix linting issues
pnpm run lint:fix
```

### Building

```bash
# Build the module
pnpm run build

# Prepare for publishing
pnpm run prepack
```

### Releasing

```bash
# Create a new release
pnpm run release
```

This will:
1. Run linting
2. Run tests
3. Build the module
4. Generate changelog
5. Publish to npm
6. Push git tags

## Advanced Topics

### Custom Provider Implementation

Create a custom OAuth provider by extending the base class:

```typescript
// server/utils/customProvider.ts
import { OAuthBaseProvider } from '#nuxt-aegis/server/providers'

export class CustomOAuthProvider extends OAuthBaseProvider {
  constructor(config) {
    super({
      name: 'custom',
      authorizationURL: 'https://provider.com/oauth/authorize',
      tokenURL: 'https://provider.com/oauth/token',
      userInfoURL: 'https://provider.com/oauth/userinfo',
      scopes: ['openid', 'profile', 'email'],
      ...config,
    })
  }

  // Override methods if needed
  async getUserInfo(accessToken: string) {
    // Custom user info retrieval
    const response = await fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.json()
  }
}

// Define the event handler
export const defineOAuthCustomEventHandler = (options) => {
  return defineEventHandler(async (event) => {
    const provider = new CustomOAuthProvider(options.config)
    return provider.handleOAuthFlow(event, options)
  })
}
```

### Claim Validation

Validate custom claims in protected routes:

```typescript
// server/middleware/adminOnly.ts
export default defineEventHandler((event) => {
  const user = event.context.user
  
  if (!user || user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }
})
```

### Custom Redirect URLs

Configure different redirect URLs for success and error scenarios:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    redirect: {
      login: '/dashboard',      // After successful login
      logout: '/goodbye',       // After logout
      error: '/auth-error',     // On authentication error
    },
  },
})
```

### TODO: SSR Considerations

The module fully supports SSR with automatic state hydration:

```vue
<script setup lang="ts">
// This works seamlessly with SSR
const { isLoggedIn, user } = useAuth()
</script>

<template>
  <div>
    <!-- User data is hydrated from server -->
    <p v-if="isLoggedIn">Welcome back, {{ user?.name }}!</p>
  </div>
</template>
```

## Troubleshooting

### Token generation fails

**Problem**: JWT token generation fails  
**Solution**: Ensure you've configured the token secret:

```typescript
// nuxt.config.ts or .env
NUXT_AEGIS_TOKEN_SECRET=your-super-secret-key-here
```

### Custom claims not appearing in token

**Problem**: Custom claims are missing from the JWT  

**Check:**
1. Claim values are of supported types (string, number, boolean, array, null)
2. You're not trying to override reserved claims (`iss`, `sub`, `exp`, etc.)
3. You're passing the customClaims to the event handler correctly

```typescript
// ✅ Correct - Static claims
export default defineOAuthGoogleEventHandler({
  customClaims: {
    role: 'admin',
    permissions: ['read', 'write'],
  },
})

// ✅ Correct - Dynamic claims
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    return {
      role: 'admin',
      permissions: ['read', 'write'],
    }
  },
})

// ❌ Wrong - Objects not supported
export default defineOAuthGoogleEventHandler({
  customClaims: {
    metadata: { foo: 'bar' }, // Objects not allowed
  },
})
```

### Cookie not being set

**Problem**: Refresh token cookie not set  

**Solution**: Verify token refresh configuration in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enabled: true,
      cookie: {
        cookieName: 'nuxt-aegis-refresh',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: true,
        httpOnly: true,
      },
    },
  },
})
```

The refresh token cookie is automatically set by the OAuth flow. If it's not being set, check your browser's developer tools to see if there are any cookie-related errors.

### Refresh token not persisting after server restart

**Problem**: Users logged out after server restart  

**Solution**: Ensure you're using persistent storage (not memory):

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      storage: {
        driver: 'fs', // Not 'memory'
        base: './.data/refresh-tokens',
      },
    },
  },
  nitro: {
    storage: {
      refreshTokenStore: {
        driver: 'fs', // Or 'redis', 'mongodb', etc.
        base: './.data/refresh-tokens',
      },
    },
  },
})
```

### Encryption/decryption errors

**Problem**: "Failed to decrypt data" errors

**Check:**
1. Encryption key is set and matches across restarts
2. Encryption key is at least 32 characters
3. You haven't changed the encryption key (existing encrypted data can't be decrypted with new key)

```bash
# .env
NUXT_AEGIS_ENCRYPTION_KEY=your-32-character-encryption-key-minimum
```

**Recovery**: If you changed the encryption key, you'll need to clear existing refresh tokens:
```bash
rm -rf ./.data/refresh-tokens/*
```

### Authorization CODE expired

**Problem**: "Invalid or expired authorization code" error

**Causes:**
1. CODE expired (default 60 seconds)
2. CODE already used (single-use enforcement)
3. Server restarted (CODEs are stored in memory)

**Solution:** The user needs to log in again. Consider increasing CODE expiration if users frequently experience slow redirects:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    authCode: {
      expiresIn: 120, // 2 minutes instead of 60 seconds
    },
  },
})
```

### 401 Unauthorized on protected routes

**Problem**: Authenticated users getting 401 errors  

**Check:**
1. Access token is being sent in Authorization header
2. Token hasn't expired
3. Route is correctly configured in `protectedRoutes`
4. Token secret matches between generation and validation

## Contributing

Contributions are welcome! Please read the following guidelines:

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm lint`)
5. Commit your changes using conventional commits
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request


## License

[MIT License](./LICENSE)

Copyright (c) 2025 Peter Budai

## Acknowledgments

- Built with [Nuxt Module Builder](https://github.com/nuxt/module-builder)
- JWT handling powered by [jose](https://github.com/panva/jose)
- Heavily inspired by the [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) and  Nuxt community

## Support

- 📖 [Documentation](https://github.com/peterbud/nuxt-aegis)
- 📋 [Requirements Specification](/specs/requirements.md)
- 🐛 [Issue Tracker](https://github.com/peterbud/nuxt-aegis/issues)

---

Made with ❤️ for the Nuxt community

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-aegis/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-aegis

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-aegis.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-aegis

[license-src]: https://img.shields.io/npm/l/nuxt-aegis.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-aegis

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
