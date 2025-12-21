# Database Types

Learn how to properly separate database models from JWT token payloads.

## The Problem

JWT tokens should only contain:
- Small, non-sensitive data
- Data needed for authorization
- Public user information

Database records often contain:
- Sensitive fields (passwords, API keys)
- Large data (full documents, blobs)
- Internal metadata (timestamps, IDs)

**Mixing these leads to security vulnerabilities and performance issues.**

## The Solution: Separate Types

### Token Payload (JWT)

```typescript
import type { CustomTokenClaims } from '#build/nuxt-aegis'

export type AppTokenPayload = CustomTokenClaims<{
  role: string
  permissions: string[]
  organizationId: string
}>
```

### Database Model

```typescript
import type { AppTokenPayload } from './token'

export interface DatabaseUser extends AppTokenPayload {
  // Database-specific fields
  id: string
  createdAt: string
  lastLogin: string
  
  // Sensitive fields - NEVER in JWT!
  hashedPassword?: string
  apiKeys?: string[]
  
  // Large or internal data
  providers?: Provider[]
  metadata?: Record<string, unknown>
}
```

## Real-World Example

```typescript
// types/database.ts
import type { AppTokenPayload } from './token'

export interface Provider {
  name: string
  id: string
}

export interface DatabaseUser extends AppTokenPayload {
  id: string
  createdAt: string
  lastLogin: string
  providers?: Provider[]
  hashedPassword?: string  // Only for password auth
}

// Database operations
export function getUserById(id: string): DatabaseUser | null {
  // Returns full database record
}

// JWT claims mapping
export function userToTokenPayload(dbUser: DatabaseUser): AppTokenPayload {
  return {
    sub: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    picture: dbUser.picture,
    role: dbUser.role,
    permissions: dbUser.permissions,
    organizationId: dbUser.organizationId,
    // Note: hashedPassword is deliberately excluded
  }
}
```

## Password Authentication Example

```typescript
// Password provider handler
password: {
  async findUser(email) {
    const dbUser = await database.findByEmail(email)
    
    if (!dbUser || !dbUser.hashedPassword) {
      return null
    }
    
    // Return PasswordUser (includes hashedPassword for verification)
    return {
      id: dbUser.id,
      email: dbUser.email,
      hashedPassword: dbUser.hashedPassword,
      // Can include other fields needed for custom claims
      role: dbUser.role,
      permissions: dbUser.permissions,
    }
  },
  
  async upsertUser(user) {
    // user.hashedPassword is available here
    await database.upsert({
      email: user.email,
      hashedPassword: user.hashedPassword,
    })
  }
}
```

## Common Fields

| Field | Database | JWT Token | Notes |
|-------|----------|-----------|-------|
| `id` / `sub` | ✓ | ✓ | Use `sub` in JWT |
| `email` | ✓ | ✓ | Safe to include |
| `name` | ✓ | ✓ | Safe to include |
| `role` | ✓ | ✓ | Needed for authorization |
| `permissions` | ✓ | ✓ | Needed for authorization |
| `hashedPassword` | ✓ | ✗ | **NEVER** in JWT |
| `apiKey` | ✓ | ✗ | **NEVER** in JWT |
| `createdAt` | ✓ | ✗ | Internal metadata |
| `providers` | ✓ | ✗ | Large/complex data |

## Best Practices

### ✓ Do

```typescript
// Extend token payload for database model
interface DatabaseUser extends AppTokenPayload {
  id: string
  hashedPassword?: string
}

// Map database to JWT claims
function toTokenPayload(db: DatabaseUser): AppTokenPayload {
  return {
    sub: db.id,
    email: db.email,
    // ... only safe fields
  }
}
```

### ✗ Don't

```typescript
// DON'T put database-only fields in token type
type AppTokenPayload = CustomTokenClaims<{
  role: string
  hashedPassword: string  // ✗ Security risk!
}>

// DON'T use database type as JWT type
const user = getAuthUser<DatabaseUser>(event)  // ✗ Wrong!
```

## Next Steps

- [Server Types](./server-types.md) - Use types in API handlers
- [Token Types](./token-types.md) - Define JWT payloads
