# Project Structure

Understanding the organization and architecture of the Nuxt Aegis codebase.

## Overview

Nuxt Aegis follows a modular architecture that separates client-side, server-side, and shared concerns. This page details the project structure, key components, and how they interact.

## Repository Structure

```
nuxt-aegis/
├── src/                          # Module source code
│   ├── module.ts                 # Module entry point & configuration
│   └── runtime/                  # Runtime code (injected into Nuxt app)
│       ├── app/                  # Client-side code
│       ├── server/               # Server-side code
│       ├── tasks/                # Background tasks
│       └── types/                # TypeScript type definitions
├── docs/                         # VitePress documentation
├── playground/                   # Development playground
├── examples/                     # Example implementations
├── test/                         # Test suites
└── specs/                        # Requirements specifications
```

## Source Structure (`src/`)

### Module Entry (`module.ts`)

The main module definition that integrates with Nuxt.

```typescript
// src/module.ts
export default defineNuxtModule({
  meta: {
    name: 'nuxt-aegis',
    configKey: 'nuxtAegis',
  },
  
  setup(options, nuxt) {
    // 1. Add runtime directory
    addServerHandler()
    addPlugin()
    addComponent()
    
    // 2. Configure storage
    setupStorage()
    
    // 3. Register server routes
    registerAuthRoutes()
    
    // 4. Add type declarations
    addTypeTemplate()
    
    // 5. Register background tasks
    registerCleanupTasks()
  },
})
```

**Key Responsibilities:**
- Module configuration and options
- Runtime code injection
- Server route registration
- Storage configuration
- Type template generation
- Hook registration

## Client-Side Structure (`src/runtime/app/`)

### Plugins (`plugins/`)

```
app/plugins/
├── api.client.ts                 # Client API interceptors
├── api.server.ts                 # Server API handling (SSR)
└── ssr-state.server.ts           # SSR state hydration
```

### Composables (`composables/`)

```
app/composables/
└── useAuth.ts                    # Main authentication composable
```

**`useAuth.ts`** - Primary authentication API
```typescript
export function useAuth() {
  return {
    // State
    isLoggedIn: computed(() => ...),
    user: computed(() => ...),
    isLoading: ref(false),
    
    // Methods
    login: (provider: string) => ...,
    logout: () => ...,
    refresh: () => ...,
  }
}
```

### Middleware (`middleware/`)

```
app/middleware/
├── auth-logged-in.ts             # Require authenticated user
└── auth-logged-out.ts            # Require logged-out user
```

**`auth-logged-in.ts`** - Route protection for authenticated routes
```typescript
export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useAuth()
  
  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
})
```

## Server-Side Structure (`src/runtime/server/`)

### Routes (`routes/`)

```
server/routes/
├── token.post.ts                 # Exchange auth CODE for JWT
├── refresh.post.ts               # Refresh JWT token
├── logout.post.ts                # Logout and revoke refresh token
├── me.get.ts                     # Current user information
├── update-claims.post.ts         # Explicit claims updates
├── impersonate.post.ts           # Start impersonation (opt-in)
├── unimpersonate.post.ts         # Restore original session (opt-in)
├── password/
│   ├── register.post.ts          # Registration request
│   ├── register-verify.get.ts    # Verify email and persist user
│   ├── login.post.ts             # User login
│   ├── login-verify.get.ts       # Login email verification
│   ├── reset-request.post.ts     # Password reset request
│   ├── reset-verify.get.ts       # Password reset verification
│   ├── reset-complete.post.ts    # Complete password reset
│   └── change.post.ts            # Change password (authenticated)
└── mock/
    ├── authorize.get.ts          # Mock OAuth authorization
    ├── token.post.ts             # Mock provider token exchange
    └── userinfo.get.ts           # Mock provider user information
```

This tree shows source files, not URL paths. The module registers handlers under configured endpoint paths; password routes are registered only when `providers.password` is configured, and impersonation routes only when `impersonation.enabled` is `true`.

OAuth initiation and callback routes are defined by the consuming application using the exported provider event handlers. The module does not supply a generic `[provider].get.ts` route. See [Providers](/providers/) for application route examples.

### Providers (`providers/`)

```
server/providers/
├── google.ts                     # Google OAuth provider
├── github.ts                     # GitHub OAuth provider
├── auth0.ts                      # Auth0 provider
├── mock.ts                       # Mock provider (testing)
└── oauthBase.ts                  # Base provider interface
```

Password authentication is implemented by the handlers in `server/routes/password/` and supporting utilities, not by a `server/providers/password.ts` file.

The built-in OAuth providers share the flow implemented in `oauthBase.ts`. Applications create routes using the [built-in provider event handlers](/api/event-handlers).

### Middleware (`middleware/`)

```
server/middleware/
└── auth.ts                       # Server route protection
```

### Plugins (`plugins/`)

```
server/plugins/
└── ssr-auth.ts                   # SSR authentication state
```

**`ssr-auth.ts`** - Resolve authentication before server-side rendering

When `nuxtAegis.enableSSR` is enabled, this Nitro plugin runs on the `request` hook for page requests. It hashes the refresh-token cookie and validates the stored record, including revocation and expiration. It then sets `event.context.user` and creates `event.context.ssrAccessToken` without rotating the refresh token or renewing its cookie.

The SSR access token uses `nuxtAegis.tokenRefresh.ssrTokenExpiry` (default: `'5m'`) and is used by the server `$api` plugin for authenticated requests during rendering. Auth routes, API routes, and asset/internal paths are skipped; existing authenticated context is preserved. Invalid sessions or authentication failures leave rendering unauthenticated rather than rejecting the page request.

**`ssr-state.server.ts`** - Initialize Nuxt state for hydration

The separate Nuxt app plugin in `src/runtime/app/plugins/` reads `event.context.user`, filters time-sensitive JWT claims, and initializes `useState('auth-state')` with the user, `authStatus: 'authenticated'`, `isLoading: false`, and `error: null`. It does not serialize the SSR access token into client state.

Currently, the SSR JWT includes stored custom claims, but `event.context.user` contains only base identity fields, so the hydrated user state does not include those custom claims. The browser obtains its own access token through the normal refresh flow, using `nuxtAegis.token.expiresIn` (default: `'1h'`), independently of the server token's lifetime.

## Background Tasks (`src/runtime/tasks/`)

```
tasks/
└── cleanup/
    ├── refresh-tokens.ts         # Clean expired refresh tokens
    ├── magic-codes.ts            # Clean expired magic CODEs
    └── reset-sessions.ts         # Clean expired reset sessions
```

## Next Steps

- [Authentication Flow](/architecture/authentication-flow) - Complete authentication process
- [Token Lifecycle](/architecture/token-lifecycle) - Token management details
