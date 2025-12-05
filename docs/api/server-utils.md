# Server Utilities

Server-side utility functions for authentication in API routes and middleware.

## Authentication Utilities

### `requireAuth(event)`

Require authentication and get the current user from JWT token.

**Type Signature:**

```typescript
async function requireAuth(event: H3Event): Promise<User>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `H3Event` | Server request event |

**Returns:** `Promise<User>` - Authenticated user object

**Throws:** `401 Unauthorized` if user is not authenticated or token is invalid/expired

**Example:**

```typescript
// server/routes/api/profile.get.ts
export default defineEventHandler(async (event) => {
  // Require authentication (throws 401 if not authenticated)
  const user = await requireAuth(event)
  
  // User is guaranteed to be authenticated here
  return {
    profile: {
      name: user.name,
      email: user.email,
      role: user.role,
    }
  }
})
```

::: danger Authentication Required
`requireAuth()` throws a 401 error if the user is not authenticated. Always handle this gracefully on the client side.
:::

### `getAuthUser(event)`

Optionally get the current user without throwing an error.

**Type Signature:**

```typescript
async function getAuthUser(event: H3Event): Promise<User | null>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `H3Event` | Server request event |

**Returns:** `Promise<User | null>` - User object if authenticated, `null` otherwise

**Example:**

```typescript
// server/routes/api/posts.get.ts
export default defineEventHandler(async (event) => {
  // Get user if authenticated (doesn't throw)
  const user = await getAuthUser(event)
  
  if (user) {
    // Return personalized content
    return await getPersonalizedPosts(user.sub)
  }
  
  // Return public content
  return await getPublicPosts()
})
```

## Token Utilities

### `generateAccessToken(user, customClaims?)`

Generate a JWT access token for a user.

**Type Signature:**

```typescript
async function generateAccessToken(
  user: Record<string, unknown>,
  customClaims?: Record<string, unknown>
): Promise<string>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | `Record<string, unknown>` | User object |
| `customClaims` | `Record<string, unknown>` | Optional custom claims |

**Returns:** `Promise<string>` - JWT access token

**Example:**

```typescript
// server/utils/createToken.ts
export async function createCustomToken(userId: string) {
  const user = await db.users.findUnique({
    where: { id: userId }
  })
  
  const token = await generateAccessToken(user, {
    role: user.role,
    premium: user.premium,
  })
  
  return token
}
```

### `verifyToken(token)`

Verify and decode a JWT access token.

**Type Signature:**

```typescript
async function verifyToken(token: string): Promise<User>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | JWT access token |

**Returns:** `Promise<User>` - Decoded user object

**Throws:** Error if token is invalid or expired

**Example:**

```typescript
// server/utils/validateToken.ts
export async function validateAccessToken(token: string) {
  try {
    const user = await verifyToken(token)
    return { valid: true, user }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
```

## Refresh Token Utilities

### `hashRefreshToken(token)`

Hash a refresh token using SHA-256. Used with `revokeRefreshToken()` and `deleteUserRefreshTokens()`.

**Type Signature:**

```typescript
function hashRefreshToken(token: string): string
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | Refresh token to hash |

**Returns:** `string` - Hashed token as hex string

**Example:**

```typescript
// server/routes/admin/revoke-token.post.ts
export default defineEventHandler(async (event) => {
  const { refreshToken } = await readBody(event)
  
  const tokenHash = hashRefreshToken(refreshToken)
  await revokeRefreshToken(tokenHash, event)
  
  return { success: true }
})
```

### `revokeRefreshToken(tokenHash, event?)`

Revoke a refresh token by marking it as revoked without deleting it. This preserves the token data for audit purposes while preventing its use.

**Type Signature:**

```typescript
async function revokeRefreshToken(
  tokenHash: string,
  event?: H3Event
): Promise<void>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tokenHash` | `string` | Hashed refresh token (use `hashRefreshToken()`) |
| `event` | `H3Event` | Optional H3 event for runtime config |

**Example:**

```typescript
// server/routes/admin/revoke-session.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  // Check admin permissions
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  
  const { refreshToken } = await readBody(event)
  const tokenHash = hashRefreshToken(refreshToken)
  
  // Revoke the token (marks as revoked, preserves for audit)
  await revokeRefreshToken(tokenHash, event)
  
  return { 
    success: true,
    message: 'Token revoked successfully' 
  }
})
```

::: tip Audit Trail
Revoked tokens remain in storage with an `isRevoked` flag, maintaining an audit trail while preventing their use.
:::

### `deleteUserRefreshTokens(email, exceptTokenHash?, event?)`

Delete all refresh tokens for a specific user. Useful for security operations like password changes or account deletion.

**Type Signature:**

```typescript
async function deleteUserRefreshTokens(
  email: string,
  exceptTokenHash?: string,
  event?: H3Event
): Promise<void>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | `string` | User email to match |
| `exceptTokenHash` | `string` | Optional token hash to preserve (e.g., current session) |
| `event` | `H3Event` | Optional H3 event for runtime config |

**Example:**

```typescript
// server/routes/auth/password/change.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { oldPassword, newPassword } = await readBody(event)
  
  // Verify old password and update to new password
  await updateUserPassword(user.email, oldPassword, newPassword)
  
  // Get current refresh token hash to preserve current session
  const currentRefreshToken = getRefreshTokenFromCookie(event)
  const currentTokenHash = currentRefreshToken 
    ? hashRefreshToken(currentRefreshToken) 
    : undefined
  
  // Revoke all other sessions for security
  await deleteUserRefreshTokens(user.email, currentTokenHash, event)
  
  return { 
    success: true,
    message: 'Password changed, other sessions revoked' 
  }
})
```

::: warning Security Best Practice
Always call `deleteUserRefreshTokens()` when users change their password or when accounts are deleted to prevent unauthorized access through old refresh tokens.
:::

## Cookie Utilities

### `setRefreshTokenCookie(event, token, maxAge)`

Set the refresh token cookie.

**Type Signature:**

```typescript
function setRefreshTokenCookie(
  event: H3Event,
  token: string,
  maxAge: number
): void
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `H3Event` | Server request event |
| `token` | `string` | Refresh token |
| `maxAge` | `number` | Cookie max age in seconds |

**Example:**

```typescript
// server/utils/customAuth.ts
export async function loginUser(event: H3Event, user: User) {
  const refreshToken = await createRefreshToken(user)
  
  setRefreshTokenCookie(event, refreshToken, 60 * 60 * 24 * 7) // 7 days
  
  const accessToken = await generateAccessToken(user)
  
  return { accessToken }
}
```

### `getRefreshTokenFromCookie(event)`

Get the refresh token from cookie.

**Type Signature:**

```typescript
function getRefreshTokenFromCookie(event: H3Event): string | undefined
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `H3Event` | Server request event |

**Returns:** `string | undefined` - Refresh token or `undefined` if not found

**Example:**

```typescript
// server/routes/check-session.get.ts
export default defineEventHandler(async (event) => {
  const refreshToken = getRefreshTokenFromCookie(event)
  
  return {
    hasSession: !!refreshToken
  }
})
```

## Custom Claims Utilities

### `applyCustomClaims(user, customClaims)`

Apply custom claims to a user object.

**Type Signature:**

```typescript
function applyCustomClaims(
  user: Record<string, unknown>,
  customClaims: Record<string, unknown> | ((user: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>)
): Promise<Record<string, unknown>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | `Record<string, unknown>` | User object |
| `customClaims` | `Record \| Function` | Custom claims object or callback |

**Returns:** `Promise<Record<string, unknown>>` - User with custom claims applied

**Example:**

```typescript
// server/utils/enrichUser.ts
export async function enrichUserData(user: User) {
  const enriched = await applyCustomClaims(user, async (u) => {
    const profile = await db.getUserProfile(u.email)
    
    return {
      role: profile.role,
      permissions: profile.permissions,
      organizationId: profile.organizationId,
    }
  })
  
  return enriched
}
```

## Complete Example

```typescript
// server/routes/api/admin/users.get.ts
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event)
  
  // Check if user has admin role
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }
  
  // Get all users
  const users = await db.users.findMany()
  
  return { users }
})
```

```typescript
// server/routes/api/posts.get.ts
export default defineEventHandler(async (event) => {
  // Optional authentication
  const user = await getAuthUser(event)
  
  if (user) {
    // Personalized posts for authenticated users
    return await db.posts.findMany({
      where: {
        OR: [
          { public: true },
          { authorId: user.sub },
        ]
      }
    })
  }
  
  // Public posts only
  return await db.posts.findMany({
    where: { public: true }
  })
})
```

## Error Handling

Handle authentication errors gracefully:

```typescript
// server/routes/api/protected.get.ts
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    
    return { data: 'protected' }
  } catch (error) {
    // Log error but don't expose details
    console.error('Auth error:', error)
    
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }
})
```

## Related

- [Route Protection Guide](/guides/route-protection)
- [Event Handlers](/api/event-handlers)
- [HTTP Endpoints](/api/endpoints)
