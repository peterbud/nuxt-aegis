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
    Server->>Storage: Store refresh token + user
    Server->>Server: Generate auth CODE
    Server-->>Client: 302 Redirect with CODE
    Client->>Server: POST /auth/token { code }
    Server->>Server: Validate & delete CODE
    Server->>Server: Generate JWT
    Server-->>Client: Return JWT token
    Client->>Client: Store JWT
    Client-->>User: Logged in!
```

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
    D -->|Yes| F{Authorized?}
    F -->|No| G[403 Forbidden]
    F -->|Yes| H[Process Request]
```

## Security Layers

```mermaid
graph TB
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
    D --> D2[Signed HS256/RS256]
    D --> D3[Custom Claims]
    
    E --> E1[HttpOnly Cookie]
    E --> E2[Server-Side Storage]
    E --> E3[7 Day Expiration]
    
    F --> F1[AES-256-GCM]
    F --> F2[Random IV]
    F --> F3[Auth Tags]
```

## Data Flow

### User Data Storage

```mermaid
graph LR
    A[OAuth Provider] -->|User Info| B[Server]
    B -->|Transform| C[nuxt-aegis:userInfo hook]
    C -->|Add Claims| D[Custom Claims Callback]
    D -->|Store| E[Refresh Token Storage]
    D -->|Sign| F[JWT Token]
    E -->|Encrypted| G[Redis/Filesystem]
    F -->|Return| H[Client]
```

### Token Types

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| **Authorization CODE** | 60 seconds | Memory | Exchange for JWT |
| **JWT Access Token** | 1 hour | Client (memory/localStorage) | API authentication |
| **Refresh Token** | 7 days | Server (Redis/filesystem) | Generate new JWTs |
| **OAuth Provider Tokens** | Varies | Not stored | Fetch user info only |

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
- **User data**: Cached with refresh token, regenerated on refresh

### Scalability

- **Stateless JWTs**: No server-side session storage for access tokens
- **Redis storage**: Horizontal scaling for refresh tokens
- **Token refresh**: Automatic refresh prevents auth interruptions

## Next Steps

- [Complete Authentication Flow](/architecture/authentication-flow)
- [Token Lifecycle](/architecture/token-lifecycle)
- [Project Structure](/architecture/project-structure)
