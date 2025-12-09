# Auth0

Configure Auth0 Universal Login for your Nuxt application.

## Setup

### 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Select **Regular Web Application**
5. Go to **Settings** tab
6. Note your **Domain**, **Client ID**, and **Client Secret**

### 2. Configure Callback URLs

In your Auth0 application settings, add:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/auth0
https://yourdomain.com/auth/auth0
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://yourdomain.com
```

### 3. Configure Module

Add Auth0 configuration to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      auth0: {
        clientId: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
        domain: process.env.AUTH0_DOMAIN!,
      },
    },
  },
})
```

### 4. Environment Variables

Add your Auth0 credentials to `.env`:

```bash
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_DOMAIN=your-tenant.auth0.com  # or your-tenant.us.auth0.com
```

### 5. Create Server Route

Create an event handler for Auth0:

```typescript
// server/routes/auth/auth0.get.ts
export default defineOAuthAuth0EventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
  },
})
```

## Authorization Parameters

### Force Login

Always show the login screen, even if the user has an active session:

```typescript
export default defineOAuthAuth0EventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
    authorizationParams: {
      prompt: 'login',
    },
  },
})
```

### Show Signup Screen

Display the signup screen instead of login:

```typescript
export default defineOAuthAuth0EventHandler({
  config: {
    authorizationParams: {
      screen_hint: 'signup',
    },
  },
})
```

### Custom Connection

Specify a particular identity provider connection:

```typescript
export default defineOAuthAuth0EventHandler({
  config: {
    authorizationParams: {
      connection: 'google-oauth2',  // or 'github', 'Username-Password-Authentication', etc.
    },
  },
})
```

## Custom Claims

::: code-group

```typescript [Static Claims]
export default defineOAuthAuth0EventHandler({
  customClaims: {
    role: 'user',
    tenant: 'acme-corp',
  },
})
```

```typescript [Dynamic Claims]
export default defineOAuthAuth0EventHandler({
  customClaims: async (user) => {
    // Access Auth0 custom claims
    const roles = user['https://myapp.com/roles'] || []
    
    return {
      roles,
      isAdmin: roles.includes('admin'),
    }
  },
})
```

:::

::: tip Auth0 Custom Claims
Auth0 requires custom claims in ID tokens to use namespaced claim names (e.g., `https://myapp.com/roles`). Configure these in Auth0 Rules or Actions.
:::

## Scopes

Common Auth0 scopes:

| Scope | Description |
|-------|-------------|
| `openid` | Required for OpenID Connect |
| `profile` | Basic profile information |
| `email` | Email address |
| `offline_access` | Request refresh token |

## User Data

The Auth0 provider returns user information in this format:

```typescript
{
  sub: 'auth0|1234567890',     // Auth0 user ID
  name: 'John Doe',
  nickname: 'john',
  picture: 'https://...',
  email: 'john@example.com',
  email_verified: true,
  updated_at: '2025-01-15T10:30:00.000Z'
}
```

## Next Steps

- [Configure custom claims](/guides/custom-claims)
- [Set up route protection](/guides/route-protection)
- [Learn about Auth0 Rules](https://auth0.com/docs/rules)
