# OAuth Providers

Nuxt Aegis supports multiple OAuth providers out of the box, making it easy to add authentication to your application.

## Supported Providers

- [Google](/providers/google) - Google OAuth 2.0
- [Auth0](/providers/auth0) - Auth0 Universal Login
- [GitHub](/providers/github) - GitHub OAuth Apps
- [Mock Provider](/providers/mock) - Development and testing
- [Custom Provider](/providers/custom) - Build your own

## Authorization Parameters

All OAuth providers support custom authorization parameters via the `authorizationParams` configuration option. These parameters are appended to the authorization URL when redirecting users to the OAuth provider.

::: warning Security Note
Critical OAuth parameters (`client_id`, `redirect_uri`, `code`, `grant_type`) are protected and cannot be overridden. If you attempt to override these, a warning will be logged and the parameters will be ignored.
:::

### Common Use Cases

::: code-group

```typescript [Google - Offline Access]
authorizationParams: {
  access_type: 'offline',  // Get refresh token
  prompt: 'consent',       // Force consent screen
}
```

```typescript [Google - Domain Restriction]
authorizationParams: {
  hd: 'example.com',  // Only allow users from example.com
}
```

```typescript [Auth0 - Force Login]
authorizationParams: {
  prompt: 'login',         // Always show login screen
  screen_hint: 'signup',   // Show signup form
}
```

```typescript [GitHub - Allow Signup]
authorizationParams: {
  allow_signup: 'true',  // Allow new account creation
}
```

:::

## Configuration Locations

Authorization parameters can be set in two places:

1. **Module Configuration** - Applied globally to all requests for that provider:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      google: {
        authorizationParams: {
          access_type: 'offline',
        },
      },
    },
  },
})
```

2. **Event Handler** - Applied only to requests handled by that specific route:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    authorizationParams: {
      prompt: 'consent',
    },
  },
})
```

::: tip Precedence
Event handler parameters override module configuration parameters if both are defined.
:::

## Next Steps

- Learn how to configure [Google](/providers/google)
- Set up [Auth0](/providers/auth0)
- Use the [Mock Provider](/providers/mock) for testing
- Build a [Custom Provider](/providers/custom)
