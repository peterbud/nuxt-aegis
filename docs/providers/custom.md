# Custom OAuth Provider

Build your own OAuth provider integration by extending the base provider class.

## Basic Implementation

Create a custom OAuth provider by extending `OAuthBaseProvider`:

```typescript
// server/utils/customProvider.ts
import { OAuthBaseProvider } from '#nuxt-aegis/server/providers'

export class CustomOAuthProvider extends OAuthBaseProvider {
  constructor(config) {
    super({
      name: 'custom',
      authorizationURL: 'https://provider.com/oauth/authorize',
      tokenURL: 'https://provider.com/oauth/token',
      userInfoURL: 'https://provider.com/oauth/userinfo',
      scopes: ['openid', 'profile', 'email'],
      ...config,
    })
  }

  // Optional: Override methods if needed
  async getUserInfo(accessToken: string) {
    // Custom user info retrieval
    const response = await fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.json()
  }
}
```

## Define Event Handler

Create a helper function to define event handlers for your custom provider:

```typescript
// server/utils/customProvider.ts
export const defineOAuthCustomEventHandler = (options) => {
  return defineEventHandler(async (event) => {
    const provider = new CustomOAuthProvider(options.config)
    return provider.handleOAuthFlow(event, options)
  })
}
```

## Configure Provider

Add your custom provider to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      custom: {
        clientId: process.env.CUSTOM_CLIENT_ID!,
        clientSecret: process.env.CUSTOM_CLIENT_SECRET!,
        // Provider-specific options
        authorizationURL: 'https://provider.com/oauth/authorize',
        tokenURL: 'https://provider.com/oauth/token',
        userInfoURL: 'https://provider.com/oauth/userinfo',
        scopes: ['openid', 'profile', 'email'],
      },
    },
  },
})
```

## Create Server Route

Use your custom event handler:

```typescript
// server/routes/auth/custom.get.ts
export default defineOAuthCustomEventHandler({
  config: {
    scopes: ['openid', 'profile', 'email'],
  },
  customClaims: {
    provider: 'custom',
  },
})
```

## Advanced Example

Here's a more complete example with custom token exchange and user info handling:

```typescript
// server/utils/linkedinProvider.ts
import { OAuthBaseProvider } from '#nuxt-aegis/server/providers'

export class LinkedInOAuthProvider extends OAuthBaseProvider {
  constructor(config) {
    super({
      name: 'linkedin',
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/userinfo',
      scopes: ['openid', 'profile', 'email'],
      ...config,
    })
  }

  async exchangeCode(code: string, redirectUri: string) {
    // LinkedIn-specific token exchange
    const response = await fetch(this.tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    })

    return response.json()
  }

  async getUserInfo(accessToken: string) {
    // LinkedIn-specific user info retrieval
    const response = await fetch(this.userInfoURL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202212',
      },
    })

    const userData = await response.json()

    // Transform LinkedIn data to standard format
    return {
      sub: userData.sub,
      name: userData.name,
      given_name: userData.given_name,
      family_name: userData.family_name,
      picture: userData.picture,
      email: userData.email,
      email_verified: userData.email_verified,
    }
  }
}

export const defineOAuthLinkedInEventHandler = (options) => {
  return defineEventHandler(async (event) => {
    const provider = new LinkedInOAuthProvider(options.config)
    return provider.handleOAuthFlow(event, options)
  })
}
```

## Override Methods

The `OAuthBaseProvider` class provides several methods you can override:

### `buildAuthorizationURL(state: string, redirectUri: string)`

Customize the authorization URL:

```typescript
buildAuthorizationURL(state: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: this.config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: this.config.scopes.join(' '),
    state,
    // Add custom parameters
    access_type: 'offline',
    prompt: 'consent',
  })

  return `${this.authorizationURL}?${params}`
}
```

### `exchangeCode(code: string, redirectUri: string)`

Customize token exchange logic:

```typescript
async exchangeCode(code: string, redirectUri: string) {
  const response = await fetch(this.tokenURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Custom headers
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    }),
  })

  return response.json()
}
```

### `getUserInfo(accessToken: string)`

Customize user info retrieval:

```typescript
async getUserInfo(accessToken: string) {
  const response = await fetch(this.userInfoURL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  const userData = await response.json()

  // Transform to standard format
  return {
    sub: userData.id,
    email: userData.email,
    name: `${userData.first_name} ${userData.last_name}`,
    picture: userData.avatar_url,
  }
}
```

## Testing

Test your custom provider with the same flow as built-in providers:

```typescript
// In your Vue component
const { login } = useAuth()
await login('custom')
```

## Best Practices

::: tip Provider Configuration
1. Store all provider-specific URLs in the config
2. Use environment variables for secrets
3. Transform user data to a standard format
4. Handle errors gracefully
5. Document required scopes
:::

::: warning Error Handling
Always implement proper error handling in your custom methods:

```typescript
async getUserInfo(accessToken: string) {
  try {
    const response = await fetch(this.userInfoURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`)
    }
    
    return response.json()
  } catch (error) {
    console.error('User info fetch failed:', error)
    throw error
  }
}
```
:::

## Next Steps

- [Learn about authentication hooks](/guides/hooks)
- [Add custom claims](/guides/custom-claims)
- [Protect your routes](/guides/route-protection)
