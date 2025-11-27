# Google OAuth

Configure Google OAuth 2.0 authentication for your Nuxt application.

## Setup

### 1. Create OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID**
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google`
   - Production: `https://yourdomain.com/auth/google`

### 2. Configure Module

Add Google configuration to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  },
})
```

### 3. Environment Variables

Add your Google credentials to `.env`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Create Server Route

Create an event handler for Google OAuth:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
  },
})
```

## Authorization Parameters

### Request Offline Access

To get a refresh token from Google, use the `access_type` and `prompt` parameters:

```typescript
export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
    authorizationParams: {
      access_type: 'offline',    // Request refresh token
      prompt: 'consent',         // Force consent screen
    },
  },
})
```

::: tip Refresh Tokens
Google only returns a refresh token on the first authorization when using `access_type: 'offline'`. If you don't receive a refresh token, revoke access in your Google account settings and re-authorize.
:::

### Restrict to Google Workspace Domain

Limit authentication to users from a specific Google Workspace domain:

```typescript
export default defineOAuthGoogleEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
    authorizationParams: {
      hd: 'example.com',  // Only allow users from example.com
    },
  },
})
```

## Custom Claims

Add application-specific claims to the JWT:

::: code-group

```typescript [Static Claims]
export default defineOAuthGoogleEventHandler({
  customClaims: {
    role: 'user',
    department: 'engineering',
  },
})
```

```typescript [Dynamic Claims]
export default defineOAuthGoogleEventHandler({
  customClaims: async (user, tokens) => {
    return {
      role: user.email?.endsWith('@admin.com') ? 'admin' : 'user',
      emailVerified: user.email_verified || false,
    }
  },
})
```

```typescript [Database Lookup]
export default defineOAuthGoogleEventHandler({
  customClaims: async (user) => {
    const profile = await db.users.findOne({ email: user.email })
    return {
      role: profile.role,
      permissions: profile.permissions,
    }
  },
})
```

:::

## Scopes

Common Google OAuth scopes:

| Scope | Description |
|-------|-------------|
| `openid` | Required for OpenID Connect |
| `profile` | Basic profile information (name, picture) |
| `email` | Email address |
| `https://www.googleapis.com/auth/userinfo.profile` | Extended profile information |
| `https://www.googleapis.com/auth/calendar.readonly` | Read-only access to Google Calendar |

[View all Google OAuth scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

## User Data

The Google provider returns user information in this format:

```typescript
{
  sub: '1234567890',           // Google user ID
  name: 'John Doe',
  given_name: 'John',
  family_name: 'Doe',
  picture: 'https://...',
  email: 'john@example.com',
  email_verified: true,
  locale: 'en'
}
```

## Troubleshooting

::: details Error: redirect_uri_mismatch
This error occurs when the redirect URI in your request doesn't match the authorized redirect URIs in your Google Cloud Console.

**Solution**: Ensure your redirect URI exactly matches (including protocol, domain, port, and path):
```
http://localhost:3000/auth/google
```
:::

::: details Not receiving refresh token
Google only returns a refresh token on the first authorization when using `access_type: 'offline'`.

**Solution**: 
1. Revoke access at [Google Account Permissions](https://myaccount.google.com/permissions)
2. Re-authorize with `prompt: 'consent'` parameter
:::

## Next Steps

- [Add custom claims](/guides/custom-claims)
- [Protect routes](/guides/route-protection)
- [Configure token refresh](/guides/token-refresh)
