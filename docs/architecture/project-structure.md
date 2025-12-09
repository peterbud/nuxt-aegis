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
    isAuthenticated: computed(() => ...),
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
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
```

## Server-Side Structure (`src/runtime/server/`)

### Routes (`routes/`)

```
server/routes/
└── auth/
    ├── token.post.ts             # Exchange auth CODE for JWT
    ├── refresh.post.ts           # Refresh JWT token
    ├── logout.post.ts            # Logout and revoke tokens
    ├── [provider].get.ts         # OAuth initiation
    └── password/
        ├── register.post.ts      # User registration
        ├── register-verify.get.ts # Email verification
        ├── login.post.ts         # User login
        ├── login-verify.get.ts   # Email verification
        ├── reset.post.ts         # Password reset request
        ├── reset-verify.get.ts   # Password reset verification
        ├── reset-confirm.post.ts # Confirm new password
        └── change.post.ts        # Change password (authenticated)
```

### Providers (`providers/`)

```
server/providers/
├── google.ts                     # Google OAuth provider
├── github.ts                     # GitHub OAuth provider
├── auth0.ts                      # Auth0 provider
├── password.ts                   # Password authentication
├── mock.ts                       # Mock provider (testing)
└── oauthBase.ts                  # Base provider interface
```


**OAuth Provider Implementation Structure:**

```typescript
// OAuth providers use a declarative implementation pattern
const providerImplementation = defineOAuthProvider({
  runtimeConfigKey: 'google', // Provider identifier
  defaultConfig: { scopes: ['openid', 'profile', 'email'] },
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  
  // Extract user info from provider response
  extractUser: (userResponse) => userResponse,
  
  // Build authorization URL query parameters
  buildAuthQuery: (config, redirectUri, state) => ({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    state,
  }),
  
  // Build token exchange body parameters
  buildTokenBody: (config, code, redirectUri) => ({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
})

// Create event handler using the implementation
export function defineOAuthGoogleEventHandler(options) {
  return defineOAuthEventHandler(providerImplementation, options)
}
```

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

**`ssr-auth.ts`** - Inject auth state into SSR context
```typescript
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', async (response, { event }) => {
    // Get auth state from refresh token
    const refreshToken = getCookie(event, 'aegis_refresh')
    
    if (refreshToken) {
      const user = await getRefreshTokenUser(refreshToken)
      
      if (user) {
        // Inject into SSR state
        response.ssrContext.payload.aegisAuth = {
          isAuthenticated: true,
          user: user,
        }
      }
    }
  })
})
```

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
