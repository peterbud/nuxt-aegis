# Mock Provider

The Mock Provider is a built-in authentication provider designed specifically for **development and testing** purposes. It simulates a complete OAuth 2.0 flow locally without requiring real provider credentials or external network calls.

::: danger Production Use
The Mock Provider is **only available in development and test environments** (`NODE_ENV !== 'production'`). It automatically blocks access in production for security.
:::

## Features

- ✅ **Zero Configuration** - Works immediately without OAuth credentials
- ✅ **Multiple User Personas** - Define different user types for testing various scenarios
- ✅ **Error Simulation** - Test error handling with query parameters
- ✅ **Fast & Deterministic** - No network calls, instant responses
- ✅ **Valid JWTs** - Generates real JWT tokens with `nuxt-aegis-mock` issuer
- ✅ **Same Flow** - Uses identical Aegis authentication flow as real providers

## Configuration

Configure mock user personas in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      mock: {
        clientId: 'mock-client-id',        // Any string
        clientSecret: 'mock-client-secret', // Any string
        mockUsers: {
          // Define user personas for testing
          admin: {
            sub: 'mock-admin-001',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
            permissions: ['read', 'write', 'delete'],
            email_verified: true,
          },
          user: {
            sub: 'mock-user-002',
            email: 'user@example.com',
            name: 'Regular User',
            role: 'user',
            permissions: ['read'],
            email_verified: true,
          },
          premium: {
            sub: 'mock-premium-003',
            email: 'premium@example.com',
            name: 'Premium User',
            subscription: 'premium',
            tier: 'gold',
            credits: 1000,
            email_verified: true,
          },
        },
        defaultUser: 'user', // User to return when no ?user= parameter
      },
    },
  },
})
```

::: tip Required Fields
All mock users **must have** `sub`, `email`, and `name` fields. Additional fields are optional and will be included in the JWT.
:::

## Server Route

Create an event handler for the mock provider:

```typescript
// server/routes/auth/mock.get.ts
export default defineOAuthMockEventHandler({
  // Optional: Add route-specific custom claims
  customClaims: {
    app: 'my-app',
    environment: 'development',
  },
})
```

## Usage

### Default User Login

Navigate to the mock provider without parameters to use the `defaultUser`:

```typescript
await navigateTo('/auth/mock')
```

### Specific User Persona

Select a specific user persona using the `user` query parameter:

```typescript
// Login as admin
await navigateTo('/auth/mock?user=admin')

// Login as premium user
await navigateTo('/auth/mock?user=premium')
```

### Error Simulation

Test error handling by triggering OAuth errors:

```typescript
// Simulate access denied
await navigateTo('/auth/mock?mock_error=access_denied')

// Simulate invalid request
await navigateTo('/auth/mock?mock_error=invalid_request')
```

## Supported OAuth Error Codes

The Mock Provider supports all standard OAuth 2.0 error codes (RFC 6749):

| Error Code | Description | Use Case |
|------------|-------------|----------|
| `access_denied` | User denied the authorization request | Test "user clicked cancel" scenario |
| `invalid_request` | Missing or malformed parameter | Test malformed OAuth requests |
| `unauthorized_client` | Client not authorized | Test unauthorized client handling |
| `invalid_scope` | Invalid, unknown, or malformed scope | Test scope validation |
| `server_error` | Unexpected server error | Test server error handling |
| `temporarily_unavailable` | Service temporarily unavailable | Test retry logic |

### Example Error Handling

```typescript
// Simulate user denying access
await navigateTo('/auth/mock?mock_error=access_denied')

// Your error handler will receive:
// {
//   error: 'access_denied',
//   error_description: 'The user denied the authorization request'
// }
```

## Testing Patterns

### Test Multiple User Roles

```typescript
describe('Authorization Tests', () => {
  it('should allow admin access', async () => {
    await navigateTo('/auth/mock?user=admin')
    // Test admin-only features
    const response = await $fetch('/api/admin/users')
    expect(response).toBeDefined()
  })

  it('should deny regular user access', async () => {
    await navigateTo('/auth/mock?user=user')
    // Test that admin features are blocked
    await expect($fetch('/api/admin/users')).rejects.toThrow()
  })
})
```

### Test Custom Claims

Define user personas with custom claims for specific test scenarios:

```typescript
mockUsers: {
  subscriber: {
    sub: 'mock-sub-001',
    email: 'subscriber@example.com',
    name: 'Subscriber',
    subscription: 'active',
    plan: 'pro',
    billingCycle: 'monthly',
    features: ['analytics', 'export', 'api-access'],
  },
  trial: {
    sub: 'mock-sub-002',
    email: 'trial@example.com',
    name: 'Trial User',
    subscription: 'trial',
    plan: 'free',
    trialEndsAt: '2025-12-31',
    features: ['basic'],
  },
}
```

### Test Error Scenarios

```typescript
it('should handle OAuth errors', async () => {
  await navigateTo('/auth/mock?mock_error=access_denied')
  
  // Verify error page or error state
  expect(window.location.pathname).toBe('/auth/error')
})
```

## Production Safety

::: danger Never Use in Production
The Mock Provider includes multiple safety mechanisms to prevent production use:
:::

- **Environment Check**: Automatically blocks in production (`NODE_ENV === 'production'`)
- **Warning Logs**: Logs prominent warnings when active in development
- **Override Option**: Can be force-enabled in production with `enableInProduction: true` (NOT RECOMMENDED)

```typescript
// ⚠️ NEVER DO THIS IN REAL PRODUCTION
mock: {
  enableInProduction: true,  // Bypasses production block - DANGEROUS
  // ... rest of config
}
```

## JWT Characteristics

Mock provider JWTs have these characteristics:

- **Issuer (`iss`)**: `nuxt-aegis-mock` (distinguishes from real providers)
- **Algorithm**: HS256 (same as real tokens)
- **Valid Signature**: Signed with your configured token secret
- **All Claims**: Includes all fields from user persona + custom claims

You can verify mock tokens in JWT debuggers just like real tokens.

## Comparison with Real Providers

| Feature | Mock Provider | Real OAuth Provider |
|---------|---------------|---------------------|
| Network Calls | ❌ None (local) | ✅ External APIs |
| Credentials Required | ❌ No | ✅ Yes (client ID/secret) |
| User Interaction | ❌ Auto-approve | ✅ Login/consent screen |
| Deterministic | ✅ Always same data | ❌ Can vary |
| Error Simulation | ✅ Via query params | ❌ Hard to reproduce |
| Production Use | ❌ Blocked | ✅ Designed for it |
| OAuth Flow | ✅ Identical | ✅ Standard |
| Token Format | ✅ Valid JWTs | ✅ Valid JWTs |

## Configuration Requirements

1. **mockUsers** - **Required**. At least one user persona must be defined
2. **clientId** & **clientSecret** - Required but can be any string
3. **defaultUser** - Optional. Defaults to first user in `mockUsers`
4. All mock users **must have** `sub`, `email`, and `name` fields

## Next Steps

- [Test custom claims](/guides/custom-claims)
- [Write authorization tests](/guides/route-protection)
- [Configure real providers](/providers/)
