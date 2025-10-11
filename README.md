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
NUXT_AEGIS_TOKEN_SECRET=your-super-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
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
      expiresIn: '1h',              // Access token expiration (default: 15 minutes)
      algorithm: 'HS256',           // Signing algorithm (HS256 or RS256)
      issuer: 'https://myapp.com',  // Token issuer
      audience: 'https://myapp.com/api', // Token audience
    },
    
    // Token Refresh Configuration
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true,       // Auto-refresh expired tokens
      cookie: {
        cookieName: 'nuxt-aegis-refresh',
        maxAge: 60 * 60 * 24 * 7,   // 7 days
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
        path: '/',
      },
    },
    
    // Redirect URLs after successful login/logout
    redirect: {
      login: '/',
      logout: '/',
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
      },
      // Add more providers as needed
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

## Authentication Providers

Nuxt Aegis supports multiple OAuth providers out of the box.

### Google OAuth

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  },
  // Add custom claims to the JWT
  customClaims: {
    role: 'user',
    permissions: ['read'],
  },
})
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
      role: user.role,
      providerId: tokens.id_token,
    }
  },
})
```

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

### Token Refresh

Nuxt Aegis provides automatic token refresh to maintain user sessions.

#### Automatic Refresh

When enabled, tokens are automatically refreshed when expired:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true, // Enable automatic refresh
    },
  },
})
```

The module automatically:
1. Handles access token expiration
2. Refreshes tokens when they have expired (if refresh token is still valid)
3. Retries failed API requests after token refresh
4. Prevents multiple simultaneous refresh requests

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
| `/auth/{provider}` | GET | Initiate OAuth login with provider |
| `/auth/callback` | GET | Client-side callback page |
| `/auth/logout` | POST | End user session |
| `/auth/refresh` | POST | Refresh access token |
| `/api/user/me` | GET | Get current user info |

### Provider-Specific Endpoints

For each configured provider (e.g., Google), the following endpoints are created:

- **Login**: `/auth/google` - Redirects to Google OAuth

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
})
```

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

```
1. User clicks "Login with Google"
   ↓
2. Client redirects to /auth/google
   ↓
3. Server redirects to Google OAuth
   ↓
4. User authenticates with Google
   ↓
5. Google redirects to /auth/google
   ↓
6. Server exchanges code for tokens
   ↓
7. Server generates JWT with custom claims
   ↓
8. Server sets refresh token as HTTP-only cookie
   ↓
9. Server redirects to /auth/callback with access token in URL hash
   ↓
10. Client stores access token in sessionStorage
    ↓
11. Client redirects to protected route or home page
```

### Token Management

- **Access Token**: Stored in `sessionStorage`, short-lived (default: 1 hour)
- **Refresh Token**: Stored in HTTP-only cookie, long-lived (default: 7 days)
- **Auto-Refresh**: Access tokens are automatically refreshed before expiration
- **Security**: Refresh tokens are never accessible to JavaScript

## Security

Nuxt Aegis implements security best practices:

### Token Security

✅ **HTTP-Only Cookies** - Refresh tokens stored in HTTP-only cookies (not accessible via JavaScript)  
✅ **Secure Cookies** - Cookies only sent over HTTPS in production  
✅ **SameSite Protection** - CSRF protection via SameSite cookie attribute  
✅ **Short-lived Access Tokens** - Access tokens expire quickly (default: 1 hour)  
✅ **Token Rotation** - New refresh tokens issued on each refresh

### Transport Security

✅ **HTTPS Required** - Enforced in production environments
✅ **No Token Exposure** - Access tokens cleared from URL after processing
✅ **No Logging of Secrets** - Secrets never logged or exposed in errors

### Validation

✅ **Signature Verification** - All JWTs verified before use
✅ **Expiration Checking** - Expired tokens rejected automatically
✅ **Issuer Validation** - Token issuer validated against configuration
✅ **Audience Validation** - Token audience validated when configured

### Best Practices

1. **Use Strong Secrets** - Use cryptographically secure random strings (min 32 characters)
2. **Environment Variables** - Never commit secrets to version control
3. **HTTPS Only** - Always use HTTPS in production
4. **Token Expiration** - Balance security with user experience
5. **Claim Validation** - Validate claims on the server side
6. **Minimal Claims** - Keep tokens small (avoid large custom claims)
7. **No Sensitive Data** - Don't store sensitive data in JWTs (they're base64 encoded, not encrypted)

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
