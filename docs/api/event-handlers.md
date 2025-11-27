# OAuth Event Handlers

Define OAuth provider endpoints using event handler functions.

## Overview

Nuxt Aegis provides specialized event handlers for each OAuth provider. These handlers create dual-purpose endpoints that handle both OAuth initiation and callback.

## Provider Event Handlers

### `defineOAuthGoogleEventHandler(config)`

Define a Google OAuth event handler.

**Type Signature:**

```typescript
function defineOAuthGoogleEventHandler(config: {
  config?: {
    clientId?: string
    clientSecret?: string
    scope?: string[]
    authorizationParams?: Record<string, string>
  }
  customClaims?: Record<string, unknown> | CustomClaimsCallback
  onUserInfo?: UserInfoCallback
  onSuccess?: SuccessCallback
}): EventHandler
```

**Example:**

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  customClaims: async (user, tokens) => {
    return {
      role: await getUserRole(user.email),
      premium: await checkPremium(user.email),
    }
  },
  onSuccess: async ({ user, provider }) => {
    console.log('Google login:', user.email)
  },
})
```

### `defineOAuthAuth0EventHandler(config)`

Define an Auth0 Universal Login event handler.

**Type Signature:**

```typescript
function defineOAuthAuth0EventHandler(config: {
  config?: {
    domain?: string
    clientId?: string
    clientSecret?: string
    audience?: string
    scope?: string[]
    authorizationParams?: Record<string, string>
  }
  customClaims?: Record<string, unknown> | CustomClaimsCallback
  onUserInfo?: UserInfoCallback
  onSuccess?: SuccessCallback
}): EventHandler
```

**Example:**

```typescript
// server/routes/auth/auth0.get.ts
export default defineOAuthAuth0EventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
    authorizationParams: {
      prompt: 'login',
      screen_hint: 'signup',
    },
  },
  customClaims: {
    role: 'user',
    accountType: 'standard',
  },
})
```

### `defineOAuthGitHubEventHandler(config)`

Define a GitHub OAuth event handler.

**Type Signature:**

```typescript
function defineOAuthGitHubEventHandler(config: {
  config?: {
    clientId?: string
    clientSecret?: string
    scope?: string[]
    authorizationParams?: Record<string, string>
  }
  customClaims?: Record<string, unknown> | CustomClaimsCallback
  onUserInfo?: UserInfoCallback
  onSuccess?: SuccessCallback
}): EventHandler
```

**Example:**

```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  config: {
    scope: ['user:email', 'read:user'],
    authorizationParams: {
      allow_signup: 'true',
    },
  },
  customClaims: async (user, tokens) => {
    return {
      username: user.login,
      isVerified: user.verified,
    }
  },
})
```

### `defineOAuthMockEventHandler(config)`

Define a Mock OAuth event handler for development/testing.

**Type Signature:**

```typescript
function defineOAuthMockEventHandler(config: {
  config: {
    clientId: string
    clientSecret: string
    mockUsers: MockUser[]
    defaultUser?: number
    enableInProduction?: boolean
  }
  customClaims?: Record<string, unknown> | CustomClaimsCallback
  onUserInfo?: UserInfoCallback
  onSuccess?: SuccessCallback
}): EventHandler
```

**Example:**

```typescript
// server/routes/auth/mock.get.ts
export default defineOAuthMockEventHandler({
  config: {
    clientId: 'mock-client',
    clientSecret: 'mock-secret',
    mockUsers: [
      {
        sub: 'mock:admin',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      },
      {
        sub: 'mock:user',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
      },
    ],
    defaultUser: 0,
  },
})
```

## Configuration Options

### Common Options

| Option | Type | Description |
|--------|------|-------------|
| `config` | `object` | Provider-specific configuration |
| `customClaims` | `object \| function` | Custom JWT claims |
| `onUserInfo` | `function` | User info transformation callback |
| `onSuccess` | `function` | Success callback |

### Config Object

Provider-specific configuration:

```typescript
interface Config {
  clientId?: string
  clientSecret?: string
  scope?: string[]
  authorizationParams?: Record<string, string>
  // ... provider-specific options
}
```

### Custom Claims

**Static claims:**

```typescript
customClaims: {
  role: 'admin',
  premium: true,
}
```

**Dynamic claims:**

```typescript
customClaims: async (user, tokens) => {
  return {
    role: await getUserRole(user.email),
    permissions: await getPermissions(user.email),
  }
}
```

### Callbacks

#### UserInfoCallback

Transform user data after fetching from OAuth provider:

```typescript
type UserInfoCallback = (
  user: Record<string, unknown>,
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  },
  event: H3Event
) => Record<string, unknown> | Promise<Record<string, unknown>>
```

**Example:**

```typescript
onUserInfo: async (user, tokens, event) => {
  // Add custom fields
  user.customField = 'value'
  
  // Normalize data
  if (user.avatar_url) {
    user.picture = user.avatar_url
    delete user.avatar_url
  }
  
  return user
}
```

#### SuccessCallback

Handle successful authentication:

```typescript
type SuccessCallback = (payload: {
  user: Record<string, unknown>
  tokens: {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in?: number
  }
  provider: string
  event: H3Event
}) => void | Promise<void>
```

**Example:**

```typescript
onSuccess: async ({ user, provider, event }) => {
  // Save to database
  await db.users.upsert({
    where: { email: user.email },
    update: { lastLogin: new Date() },
    create: {
      id: user.sub,
      email: user.email,
      name: user.name,
      provider,
    },
  })
  
  // Send analytics
  await analytics.track('user_login', {
    userId: user.sub,
    provider,
  })
}
```

## Complete Example

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent',
      hd: 'example.com', // Restrict to domain
    },
  },
  
  customClaims: async (user, tokens) => {
    // Fetch user profile from database
    const profile = await db.users.findUnique({
      where: { email: user.email },
      include: { organization: true },
    })
    
    return {
      role: profile?.role || 'user',
      permissions: profile?.permissions || [],
      organizationId: profile?.organization?.id,
      premium: profile?.premium || false,
    }
  },
  
  onUserInfo: async (user, tokens, event) => {
    // Fetch additional data from Google
    const calendar = await $fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })
    
    user.hasCalendar = calendar.items.length > 0
    
    return user
  },
  
  onSuccess: async ({ user, provider, event }) => {
    // Update user in database
    await db.users.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        picture: user.picture,
        lastLogin: new Date(),
      },
      create: {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider,
        createdAt: new Date(),
      },
    })
    
    // Send welcome email for new users
    const isNewUser = await db.users.count({
      where: { email: user.email },
    }) === 1
    
    if (isNewUser) {
      await sendWelcomeEmail(user.email)
    }
    
    // Track analytics
    await analytics.track('user_authenticated', {
      userId: user.sub,
      provider,
      isNewUser,
    })
  },
})
```

## Custom OAuth Providers

Create custom providers by extending the base class:

```typescript
// server/utils/linkedinProvider.ts
import { OAuthBaseProvider } from '#nuxt-aegis/server/providers'

export class LinkedInOAuthProvider extends OAuthBaseProvider {
  constructor(config) {
    super({
      name: 'linkedin',
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/me',
      ...config,
    })
  }
  
  async getUserInfo(accessToken: string) {
    // Fetch user profile
    const profile = await $fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    // Fetch email separately (LinkedIn quirk)
    const email = await $fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    return {
      sub: profile.id,
      name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
      email: email.elements[0]['handle~'].emailAddress,
      picture: profile.profilePicture?.displayImage,
    }
  }
}
```

Use custom provider:

```typescript
// server/routes/auth/linkedin.get.ts
import { LinkedInOAuthProvider } from '~/server/utils/linkedinProvider'

export default defineEventHandler(async (event) => {
  const provider = new LinkedInOAuthProvider({
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    scope: ['r_liteprofile', 'r_emailaddress'],
  })
  
  return await provider.handleRequest(event)
})
```

## Related

- [Provider Configuration](/providers/)
- [Custom Claims](/guides/custom-claims)
- [Authentication Hooks](/guides/hooks)
