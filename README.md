# Nuxt Aegis

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt module for authentication using OAuth providers, with JWT token generation and session management.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-aegis?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

<!-- Highlight some of the features your module provide here -->
- ⛰ &nbsp;Foo
- 🚠 &nbsp;Bar
- 🌲 &nbsp;Baz

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-aegis
```

That's it! You can now use Nuxt Aegis in your Nuxt app ✨

# Token Generation with Custom Claims

This guide explains how to generate JWT tokens with custom claims after successful OAuth authentication.

## Overview

After a user successfully authenticates via an OAuth provider (e.g., Google, Microsoft, Github), you'll want to:
1. Generate a JWT token with standard claims (sub, email, name, etc.)
2. Add custom claims specific to your application (role, permissions, etc.)
3. Store the token securely in an HTTP-only cookie

## Standard Approach

### Using `generateAuthToken` Helper

The recommended way is to use the `generateAuthToken` helper function in your OAuth handler's `onSuccess` callback:

```typescript
import { generateAuthToken, setTokenCookie } from '#nuxt-aegis/server/utils'

export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
  },
  async onSuccess(event, { user, tokens }) {
    // Generate token with custom claims
    const customClaims = {
      role: 'user',
      permissions: ['read', 'write'],
      department: 'engineering',
      isActive: true,
    }

    const token = await generateAuthToken(event, user, customClaims)

    // Set the token as a secure HTTP-only cookie
    const sessionConfig = useRuntimeConfig(event).nuxtAegis?.session
    setTokenCookie(event, token, sessionConfig)
  },
})
```

## Custom Claims

### Static Custom Claims

You can provide static custom claims as a plain object:

```typescript
const token = await generateAuthToken(event, user, {
  role: 'admin',
  department: 'engineering',
  accountType: 'premium',
})
```

### Dynamic Custom Claims

Generate custom claims based on user data:

```typescript
const customClaims = {
  role: user.email?.endsWith('@admin.com') ? 'admin' : 'user',
  permissions: getUserPermissions(user.email),
  emailVerified: user.email_verified || false,
  loginCount: await getLoginCount(user.sub),
}

const token = await generateAuthToken(event, user, customClaims)
```

### Database Lookups

Fetch additional user data from your database:

```typescript
async onSuccess(event, { user, tokens }) {
  // Fetch user profile from database
  const userProfile = await db.getUserProfile(user.email)

  const customClaims = {
    role: userProfile.role,
    permissions: userProfile.permissions,
    organizationId: userProfile.organizationId,
    subscription: userProfile.subscription,
  }

  const token = await generateAuthToken(event, user, customClaims)
  setTokenCookie(event, token)
}
```

## Supported Claim Types

The following types are supported for custom claims:

- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values
- `Array<string | number | boolean>` - Arrays of primitives
- `null` - Null values

**Example:**

```typescript
const customClaims = {
  role: 'admin',                            // string
  age: 30,                                  // number
  isActive: true,                           // boolean
  permissions: ['read', 'write', 'delete'], // array
  tags: [1, 2, 3],                          // array of numbers
  metadata: null,                           // null
}
```

## Reserved Claims

The following JWT claims are **reserved** and cannot be overridden:

- `iss` - Issuer (configured in `nuxt.config.ts`)
- `sub` - Subject (user identifier)
- `exp` - Expiration time (configured in `nuxt.config.ts`)
- `iat` - Issued at (automatically set)
- `nbf` - Not before (if set)
- `jti` - JWT ID (if set)
- `aud` - Audience (configured in `nuxt.config.ts`)

If you attempt to override these claims, they will be filtered out and a warning will be logged.

## Standard Claims in Generated Token

The `generateAuthToken` function automatically includes these standard claims:

- `sub` - User's subject identifier (from `user.sub` or `user.email` or `user.id`)
- `email` - User's email address
- `name` - User's full name
- `picture` - User's profile picture URL
- `iss` - Issuer (if configured)
- `aud` - Audience (if configured)
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

## Configuration

Configure your token settings in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-aegis'],
  
  nuxtAegis: {
    token: {
      secret: process.env.JWT_SECRET!,
      expiresIn: '1h',  // or 3600 for seconds
      algorithm: 'HS256',
      issuer: 'https://myapp.com',
      audience: 'https://myapp.com/api',
    },
    session: {
      cookieName: 'auth-token',
      maxAge: 604800, // 7 days
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    },
  },
})
```

## Complete Example

Here's a complete example showing all the pieces together:

```typescript
import { generateAuthToken, setTokenCookie } from '#nuxt-aegis/server/utils'

export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
  },
  
  async onSuccess(event, { user, tokens }) {
    try {
      // 1. Fetch additional user data from your database
      const userProfile = await getUserFromDatabase(user.email)
      
      // 2. Determine user role and permissions
      const role = determineUserRole(user, userProfile)
      const permissions = getPermissionsForRole(role)
      
      // 3. Build custom claims
      const customClaims = {
        role,
        permissions,
        organizationId: userProfile?.organizationId,
        emailVerified: user.email_verified || false,
        accountType: userProfile?.accountType || 'free',
        features: userProfile?.enabledFeatures || [],
      }
      
      // 4. Generate JWT with custom claims
      const token = await generateAuthToken(event, user, customClaims)
      
      // 5. Set token as secure HTTP-only cookie
      const sessionConfig = useRuntimeConfig(event).nuxtAegis?.session
      setTokenCookie(event, token, sessionConfig)
      
      // 6. Update login timestamp in database
      await updateLastLogin(user.email)
      
      console.log(`User ${user.email} logged in successfully`)
      
    } catch (error) {
      console.error('Error during authentication:', error)
      throw error
    }
  },
  
  onError(event, error) {
    console.error('OAuth error:', error)
    // Handle error appropriately
  },
})
```

## Best Practices

1. **Keep tokens small** - Don't add too many claims, as JWTs are sent with every request
2. **Don't store sensitive data** - JWTs can be decoded by anyone (they're just base64 encoded)
3. **Use appropriate expiration times** - Balance security with user experience
4. **Validate claims on the server** - Always verify claims when processing requests
5. **Use secure cookies** - Set `httpOnly`, `secure`, and appropriate `sameSite` values
6. **Log authentication events** - Track logins for security and debugging
7. **Handle errors gracefully** - Provide meaningful error messages

## Troubleshooting

### Token generation fails

Make sure you've configured the token secret in your `nuxt.config.ts`:

```typescript
nuxtAegis: {
  token: {
    secret: process.env.JWT_SECRET!,
  },
}
```

### Custom claims not appearing in token

Check that:
1. The claim values are of supported types (string, number, boolean, array, null)
2. You're not trying to override reserved claims
3. You're passing the customClaims object to `generateAuthToken`

### Cookie not being set

Verify your session configuration and ensure you're calling `setTokenCookie` after generating the token.

# Quick Reference: Token Generation with Custom Claims

## Import

```typescript
import { generateAuthToken, setTokenCookie } from '#nuxt-aegis/server/utils'
```

## Basic Pattern

```typescript
export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user, tokens }) {
    const token = await generateAuthToken(event, user, {
      // Add your custom claims here
      role: 'user',
      permissions: ['read'],
    })
    
    setTokenCookie(event, token)
  },
})
```

## Common Patterns

### Static Claims
```typescript
const token = await generateAuthToken(event, user, {
  role: 'admin',
  department: 'IT',
})
```

### Conditional Claims
```typescript
const claims = {
  role: user.email.endsWith('@admin.com') ? 'admin' : 'user',
  isPremium: checkPremiumStatus(user),
}
const token = await generateAuthToken(event, user, claims)
```

### Database Lookup
```typescript
const profile = await db.users.findOne({ email: user.email })
const token = await generateAuthToken(event, user, {
  role: profile.role,
  orgId: profile.organizationId,
})
```

## Standard Claims (Automatic)

- `sub` - User ID
- `email` - User email
- `name` - User name
- `picture` - Avatar URL
- `iss` - Issuer (from config)
- `aud` - Audience (from config)
- `iat` - Issued at
- `exp` - Expires at

## Reserved Claims (Cannot Override)

`iss`, `sub`, `exp`, `iat`, `nbf`, `jti`, `aud`

## Allowed Types

✅ string, number, boolean, array, null
❌ objects, functions, undefined

## Configuration (nuxt.config.ts)

```typescript
nuxtAegis: {
  token: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'https://myapp.com',
    audience: 'https://myapp.com/api',
  },
}
```

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-aegis/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-aegis

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-aegis.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-aegis

[license-src]: https://img.shields.io/npm/l/nuxt-aegis.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-aegis

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
