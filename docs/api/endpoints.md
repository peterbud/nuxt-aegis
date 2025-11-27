# Authentication Endpoints

REST API endpoints automatically created by Nuxt Aegis.

## Overview

Nuxt Aegis automatically creates authentication endpoints for OAuth flows, token management, and user information.

## Authentication Endpoints

### GET `/auth/{provider}`

Dual-purpose endpoint that handles both OAuth initiation and callback.

**Initial Login** (no `code` parameter):

```http
GET /auth/google HTTP/1.1
Host: example.com
```

Redirects user to OAuth provider's authorization page.

**OAuth Callback** (with `code` parameter):

```http
GET /auth/google?code=oauth_authorization_code HTTP/1.1
Host: example.com
```

Exchanges OAuth CODE for tokens, generates authorization CODE, and redirects to `/auth/callback?code=...`.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | OAuth authorization CODE from provider |
| `state` | `string` | CSRF protection state parameter |
| `error` | `string` | Error code from OAuth provider |
| `error_description` | `string` | Human-readable error description |

**Example:**

```typescript
// Redirect user to login
await navigateTo('/auth/google')

// Or use composable
const { login } = useAuth()
await login('google')
```

### GET `/auth/callback`

Client-side callback page that exchanges authorization CODE for JWT token.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | `string` | ✅ | Authorization CODE from server |

**Example URL:**

```
https://example.com/auth/callback?code=abc123xyz456
```

This page automatically:
1. Extracts CODE from URL
2. Calls `/auth/token` to exchange CODE for JWT
3. Stores JWT token
4. Redirects to configured success URL

::: tip Automatic Handling
This endpoint is handled automatically by the module. You don't need to implement it manually.
:::

### POST `/auth/token`

Exchange authorization CODE for JWT access token.

**Request Body:**

```json
{
  "code": "abc123xyz456"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Response:**

```json
{
  "statusCode": 401,
  "message": "Invalid or expired authorization code"
}
```

**Example:**

```typescript
const { token } = await $fetch('/auth/token', {
  method: 'POST',
  body: {
    code: 'abc123xyz456'
  }
})
```

**Security Features:**

- Single-use CODE enforcement (deleted after exchange)
- 60-second CODE expiration
- Cryptographically secure CODE validation

### POST `/auth/refresh`

Refresh expired access token using refresh token cookie.

**Request:**

```http
POST /auth/refresh HTTP/1.1
Host: example.com
Cookie: nuxt-aegis-refresh=refresh_token_value
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Response:**

```json
{
  "statusCode": 401,
  "message": "Invalid or expired refresh token"
}
```

**Example:**

```typescript
const { token } = await $fetch('/auth/refresh', {
  method: 'POST'
  // Refresh token cookie sent automatically
})

// Or use composable
const { refresh } = useAuth()
await refresh()
```

**How it works:**

1. Refresh token sent automatically via HttpOnly cookie
2. Server validates token from persistent storage
3. Server retrieves stored user object
4. Server generates new access token with custom claims
5. Server optionally rotates refresh token
6. Server returns new access token

### POST `/auth/logout`

End user session and revoke refresh token.

**Request:**

```http
POST /auth/logout HTTP/1.1
Host: example.com
Cookie: nuxt-aegis-refresh=refresh_token_value
```

**Response:**

```json
{
  "success": true
}
```

**Example:**

```typescript
await $fetch('/auth/logout', {
  method: 'POST'
})

// Or use composable
const { logout } = useAuth()
await logout()
```

**What happens:**

1. Server retrieves refresh token from cookie
2. Server deletes refresh token from storage
3. Server deletes refresh token cookie
4. User is logged out

### GET `/api/user/me`

Get current user information from JWT token.

**Request:**

```http
GET /api/user/me HTTP/1.1
Host: example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "sub": "google:123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/avatar.jpg",
  "provider": "google",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700003600
}
```

**Error Response:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Example:**

```typescript
// Client-side with useAuth
const { user } = useAuth()
console.log(user.value)

// Server-side API call
const user = await $fetch('/api/user/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
})
```

## Provider-Specific Endpoints

Each configured provider gets its own dual-purpose endpoint.

### Google

```
GET /auth/google          # Initiate OAuth
GET /auth/google?code=... # OAuth callback
```

### Auth0

```
GET /auth/auth0          # Initiate OAuth
GET /auth/auth0?code=... # OAuth callback
```

### GitHub

```
GET /auth/github          # Initiate OAuth
GET /auth/github?code=... # OAuth callback
```

### Mock Provider

```
GET /auth/mock          # Initiate mock OAuth
GET /auth/mock?code=... # Mock OAuth callback
```

## Mock Provider Endpoints

The mock provider creates additional endpoints for development/testing:

### GET `/mock/authorize`

Mock OAuth authorization endpoint (internal).

### POST `/mock/token`

Mock OAuth token endpoint (internal).

### GET `/mock/userinfo`

Mock OAuth userinfo endpoint (internal).

## Error Handling

All endpoints return standard HTTP error codes:

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `400` | Bad Request (missing parameters) |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (insufficient permissions) |
| `500` | Internal Server Error |

**Error Response Format:**

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

## Client Usage

### Composable Methods

Recommended approach using `useAuth()`:

```typescript
const { login, logout, refresh } = useAuth()

// Login
await login('google')

// Logout
await logout()

// Refresh token
await refresh()
```

### Direct API Calls

Using `$fetch` for custom flows:

```typescript
// Login redirect
await navigateTo('/auth/google')

// Token exchange
const { token } = await $fetch('/auth/token', {
  method: 'POST',
  body: { code: authCode }
})

// Refresh
const { token } = await $fetch('/auth/refresh', {
  method: 'POST'
})

// Logout
await $fetch('/auth/logout', {
  method: 'POST'
})

// Get user
const user = await $fetch('/api/user/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

## Server-Side Usage

Protect API endpoints using server utilities:

```typescript
// server/routes/api/profile.get.ts
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event)
  
  return {
    profile: user
  }
})
```

## Complete Flow Example

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant OAuth
    participant Storage

    Client->>Server: GET /auth/google
    Server-->>Client: 302 Redirect to OAuth
    Client->>OAuth: Login & Authorize
    OAuth-->>Server: GET /auth/google?code=...
    Server->>OAuth: POST /token (exchange CODE)
    OAuth-->>Server: Return tokens
    Server->>OAuth: GET /userinfo
    OAuth-->>Server: Return user data
    Server->>Storage: Store refresh token
    Server-->>Client: 302 Redirect /auth/callback?code=CODE
    Client->>Server: POST /auth/token { code: CODE }
    Server->>Storage: Validate & delete CODE
    Server-->>Client: Return JWT token
    Client->>Server: GET /api/user/me
    Server-->>Client: Return user data
```

## Related

- [Client-Side Authentication](/guides/client-auth)
- [Route Protection](/guides/route-protection)
- [Server Utilities](/api/server-utils)
