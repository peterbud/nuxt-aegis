# Architecture

Understanding Nuxt Aegis architecture and authentication flows.

## Overview

Nuxt Aegis implements a secure OAuth 2.0 + JWT authentication system with token refresh and authorization CODE flow.

## Key Components

```mermaid
graph TB
    A[Client/Browser] -->|OAuth Login| B[Server Routes]
    B -->|Redirect| C[OAuth Provider]
    C -->|Callback| B
    B -->|Store| D[Refresh Token Storage]
    B -->|Issue| E[JWT Token]
    E -->|Auth Header| F[Protected API]
    D -->|Refresh| B
```

### Client-Side Components

- **`useAuth()` Composable** - Reactive authentication state management
- **Router Middleware** - Client-side route protection
- **Token Storage** - JWT access token management
- **Refresh Cookie** - HttpOnly refresh token cookie

### Server-Side Components

- **OAuth Routes** - Handle OAuth flows (`/auth/{provider}`)
- **Token Endpoints** - Token exchange and refresh (`/auth/token`, `/auth/refresh`)
- **Server Middleware** - Automatic route protection
- **Server Utils** - `requireAuth()`, `getAuthUser()`
- **Storage Layer** - Persistent refresh token storage (Redis/filesystem)

### Authentication Flow

Detailed authentication flow documentation:

- [Complete Authentication Flow](/architecture/authentication-flow)
- [Token Lifecycle](/architecture/token-lifecycle)
- [Project Structure](/architecture/project-structure)

## Architecture Diagrams

### High-Level Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Server
    participant OAuth
    participant Storage

    User->>Client: Click "Login with Google"
    Client->>Server: GET /auth/google
    Server-->>User: 302 Redirect to Google OAuth
    User->>OAuth: Authorize app
    OAuth-->>Server: GET /auth/google?code=...
    Server->>OAuth: Exchange auth CODE
    OAuth-->>Server: Access + Refresh tokens
    Server->>OAuth: Fetch user info
    OAuth-->>Server: User data
    Server->>Server: Generate auth CODE
    Server-->>Client: 302 Redirect with CODE
    Client->>Server: POST /auth/token { code }
    Server->>Server: Validate & delete CODE
    opt Application refresh tokens enabled
        Server->>Server: Generate Aegis refresh token
        Server->>Storage: Store refresh token record + user data + custom claims
    end
    Server->>Server: Generate JWT
    opt Application refresh tokens enabled
        Server-->>Client: Set Aegis refresh token cookie (HttpOnly)
    end
    Server-->>Client: Return JWT token
    Client->>Client: Store JWT
    Client-->>User: Logged in!
```

The OAuth callback creates the short-lived Aegis authorization CODE, not the application's refresh token. After the client exchanges that CODE at `POST /auth/token`, the server creates and stores an Aegis refresh token (if enabled) and sets its HttpOnly cookie on the token-exchange response. This token is separate from any refresh token returned by the OAuth provider.

### Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Storage

    Client->>Server: Request with expired JWT
    Server->>Server: Detect expired token
    Client->>Server: POST /auth/refresh
    Note over Client,Server: Refresh token cookie sent automatically
    Server->>Storage: Validate refresh token
    Storage-->>Server: Return user data
    Server->>Server: Generate new JWT
    Server->>Server: Apply custom claims
    Server-->>Client: Return new JWT
    Client->>Client: Update stored token
    Client->>Server: Retry original request
    Server-->>Client: Success
```

### Route Protection Flow

```mermaid
graph LR
    A[Request] --> B{Protected Route?}
    B -->|No| C[Allow]
    B -->|Yes| D{Authenticated?}
    D -->|No| E[401 Unauthorized]
    D -->|Yes| F{Application role/permission check}
    F -->|Denied| G[Application returns 403 Forbidden]
    F -->|Yes| H[Process Request]

    class E error-node
    class G error-node
```

Nuxt Aegis enforces authentication on protected routes by verifying the JWT and applying configured issuer and audience checks. It does not automatically enforce roles or permissions. The authorization check and 403 response shown above must be implemented by application route handlers or middleware; an authenticated user is not necessarily authorized for an operation.

## Security Layers

```mermaid
graph LR
    A[Security Layers] --> B[OAuth 2.0]
    A --> C[Authorization CODE]
    A --> D[JWT Tokens]
    A --> E[Refresh Tokens]
    A --> F[Encryption]
    
    B --> B1[Provider Authentication]
    B --> B2[PKCE Support]
    
    C --> C1[60s Expiration]
    C --> C2[Single-Use]
    C --> C3[Crypto Random]
    
    D --> D1[Short-Lived 1h]
    D --> D2[Signed HS256 by default]
    D --> D3[Custom Claims]
    
    E --> E1[HttpOnly Cookie]
    E --> E2[Server-Side Storage]
    E --> E3[7 Day Expiration]
    
    F --> F1[AES-256-GCM]
    F --> F2[Random IV]
    F --> F3[Auth Tags]
```

JWT signing and verification use a shared symmetric secret, with HS256 as the default algorithm. RS256 is not supported yet by the current key handling: setting `token.algorithm` to `'RS256'` does not import an RSA key and causes signing to fail.

## Data Flow

### User Data Storage

```mermaid
graph LR
    A[OAuth Provider] -->|User Info| B[Server]
    B -->|Transform| C[onUserInfo Callback]
    C -->|Add Claims| D[Custom Claims Callback]
    D -->|Store| E[Refresh Token Storage]
    D -->|Sign| F[JWT Token]
    E -->|Plaintext by default; encrypted if enabled| G[Redis/Filesystem]
    F -->|Return| H[Client]
```

User-info transformation uses the provider-level `onUserInfo` callback when configured, otherwise the global Aegis handler's `onUserInfo` callback.

Refresh token records are stored in plaintext by default. To enable AES-256-GCM encryption at rest, set `nuxtAegis.tokenRefresh.encryption.enabled` to `true` and configure an encryption key. See [Storage Configuration](../configuration/storage.md#encryption-at-rest).

### Token Types

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| **Authorization CODE** | 60 seconds | Memory | Exchange for JWT |
| **JWT Access Token** | 1 hour | Client (memory only) | API authentication |
| **Refresh Token** | 7 days | Server (Redis/filesystem) | Generate new JWTs |
| **OAuth Provider Tokens** | Provider-dependent | Server authorization-code store (temporary) | Fetch user info and supply configured callbacks |

Provider tokens are retained as `providerTokens` alongside the Aegis authorization code in `authCodeStore` until the code record is consumed or removed. The code's validity period (60 seconds by default) is separate from the provider tokens' lifetime; expiry does not itself guarantee immediate deletion of the stored record.

## Module Integration

```mermaid
graph TB
    A[Nuxt App] --> B[nuxt-aegis Module]
    B --> C[Runtime Plugin]
    B --> D[Server Routes]
    B --> E[Server Middleware]
    B --> F[Composables]
    
    C --> C1[Token Store]
    C --> C2[API Client]
    
    D --> D1[/auth/provider]
    D --> D2[/auth/token]
    D --> D3[/auth/refresh]
    D --> D4[/auth/logout]
    
    E --> E1[Route Protection]
    E --> E2[Token Validation]
    
    F --> F1[useAuth]
    
```

## Performance Considerations

### Caching Strategy

- **JWT tokens**: Short-lived (1h) to balance security and performance
- **Refresh tokens**: Long-lived (7 days) to minimize re-authentication
- **User data and custom claims**: Stored with the refresh token and reused during ordinary refresh; no user-data reload or claims recomputation

To recompute claims explicitly, use `refresh({ updateClaims: true })`, which calls `/auth/update-claims` before refreshing the token. See [Updating JWT Claims](/guides/updating-claims). Without an explicit update, stored roles and permissions can remain stale.

### Scalability

- **Stateless JWTs**: No server-side session storage for access tokens
- **Redis storage**: Horizontal scaling for refresh tokens
- **Token refresh**: Automatic refresh prevents auth interruptions

## Next Steps

- [Complete Authentication Flow](/architecture/authentication-flow)
- [Token Lifecycle](/architecture/token-lifecycle)
- [Project Structure](/architecture/project-structure)
