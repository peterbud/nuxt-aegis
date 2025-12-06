# Token Types

Define type-safe custom JWT token payloads for your application.

## CustomTokenClaims Helper

The `CustomTokenClaims<T>` helper type extends `TokenPayload` with your custom claims while ensuring type safety and JSON-serializability.

```typescript
import type { CustomTokenClaims } from '#nuxt-aegis'

type AppTokenPayload = CustomTokenClaims<{
  role: string
  permissions: string[]
  organizationId: string
}>
```

### Supported Value Types

Custom claims must be JSON-serializable:
- Primitives: `string`, `number`, `boolean`, `null`, `undefined`
- Arrays: `string[]`, `number[]`
- Objects (one level): `{ [key: string]: string | number | boolean | ... }`

```typescript
type AppTokenPayload = CustomTokenClaims<{
  // ✓ Primitives
  role: string
  isActive: boolean
  loginCount: number
  
  // ✓ Arrays
  permissions: string[]
  favoriteNumbers: number[]
  
  // ✓ Nested objects (one level)
  metadata: {
    tenantId: string
    plan: string
  }
  
  // ✗ NOT ALLOWED
  // callback: () => void  // Functions not allowed
  // nested: { deep: { value: string } }  // Deep nesting not allowed
}>
```

## Client-Side Usage

Use the generic type parameter with `useAuth()`:

```typescript
import type { AppTokenPayload } from '~/types/token'

const { user, login, logout } = useAuth<AppTokenPayload>()

// All fields are fully typed
if (user.value) {
  console.log(user.value.sub)      // Standard field
  console.log(user.value.role)     // Custom claim - fully typed!
  console.log(user.value.permissions) // string[] - fully typed!
}
```

## ExtractClaims Utility

Extract only custom claims from a token payload:

```typescript
import type { ExtractClaims } from '#nuxt-aegis'

type AppTokenPayload = CustomTokenClaims<{
  role: string
  permissions: string[]
}>

type OnlyCustomClaims = ExtractClaims<AppTokenPayload>
// Result: { role: string, permissions: string[] }
```

Useful for:
- Type composition
- Claim validation functions
- Documenting which fields are custom

## Best Practices

### ✓ Do

```typescript
// Keep payloads small and focused
type AppTokenPayload = CustomTokenClaims<{
  role: 'admin' | 'user' | 'guest'  // Use literal types for enums
  permissions: string[]
  tenantId: string
}>

// Use meaningful field names
type AppTokenPayload = CustomTokenClaims<{
  organizationId: string  // ✓ Clear
  orgId: string          // ✗ Ambiguous
}>
```

### ✗ Don't

```typescript
// DON'T include sensitive data
type BadTokenPayload = CustomTokenClaims<{
  password: string        // ✗ Never!
  hashedPassword: string  // ✗ Never!
  apiKey: string          // ✗ Never!
  secret: string          // ✗ Never!
}>

// DON'T include large data
type BadTokenPayload = CustomTokenClaims<{
  profileImageBase64: string  // ✗ Use URLs instead
  fullDocument: object        // ✗ Use references
}>
```

## Token Size Warning

Nuxt Aegis automatically warns in development if your token payload exceeds 1KB:

```
Token payload size (1234 bytes) exceeds recommended threshold (1024 bytes).
Consider reducing the payload size by removing unnecessary claims or using
references instead of large values.
```

Keep tokens small for:
- Better performance
- Lower bandwidth usage
- Compatibility with all systems

## Complete Example

```typescript
// ~/types/token.ts
import type { CustomTokenClaims } from '#nuxt-aegis'

/**
 * Application JWT token payload
 * 
 * @example
 * ```typescript
 * const { user } = useAuth<AppTokenPayload>()
 * if (user.value?.role === 'admin') {
 *   // Admin-specific logic
 * }
 * ```
 */
export type AppTokenPayload = CustomTokenClaims<{
  /** User role in the system */
  role: 'admin' | 'user' | 'guest'
  
  /** Array of permission strings */
  permissions: string[]
  
  /** Organization/tenant ID */
  organizationId: string
  
  /** Optional: Additional metadata */
  metadata?: {
    department?: string
    region?: string
  }
}>
```

## Next Steps

- [Database Types](./database-types.md) - Separate DB models from JWT payloads
- [Server Types](./server-types.md) - Use types in server handlers
- [API Reference](../../api/types.md) - Complete type documentation
