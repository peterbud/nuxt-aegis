# TypeScript Types

Complete guide to using TypeScript with Nuxt Aegis for type-safe authentication.

## Overview

Nuxt Aegis provides comprehensive TypeScript support with generic types that allow you to define custom JWT token claims while maintaining type safety across your entire application.

## Quick Start

```typescript
// 1. Define your token payload
import type { CustomTokenClaims } from '#nuxt-aegis'

type AppTokenClaims = CustomTokenClaims<{
  role: string
  permissions: string[]
}>

// 2. Use with useAuth
const { user } = useAuth<AppTokenClaims>()
console.log(user.value?.role) // ✓ Type-safe!

// 3. Use with getAuthUser
const user = getAuthUser<AppTokenClaims>(event)
return { role: user.role } // ✓ Type-safe!
```

## Key Concepts

### JWT Token Payload vs Database Models

**Important:** Distinguish between what goes in JWT tokens vs what stays in your database:

- **Token Payload**: Data stored in JWT (small, public, non-sensitive)
- **Database Model**: Complete user record (can include sensitive fields)

See the detailed guides below for best practices.

## Guides

### [Token Types](./token-types.md)
Learn how to define custom JWT token payloads with `CustomTokenClaims`, use `useAuth<T>()` for type-safe client-side authentication, and work with `ExtractClaims` utility type.

### [Database Types](./database-types.md)
Understand how to separate database models from JWT payloads, see why sensitive fields like `hashedPassword` should never be in tokens, and learn mapping patterns between database records and JWT claims.

### [Server Types](./server-types.md)
Master type-safe server-side authentication with `getAuthUser<T>()`, implement typed event handlers, and work with custom claims in API routes.

## Reference

For complete API documentation, see:
- [API: Types Reference](../../api/types.md) - All exported types
- [API: Composables](../../api/composables.md) - Client-side composables

## Examples

Check out the example implementations:
- **Playground**: `/playground/shared/types/` - Full-featured example with custom claims
- **Minimal**: `/examples/minimal/shared/types/` - Basic setup with standard claims only

Both examples demonstrate the recommended type patterns and can be used as references for your own project.
