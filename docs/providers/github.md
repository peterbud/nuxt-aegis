# GitHub OAuth

Configure GitHub OAuth authentication for your Nuxt application.

## Setup

### 1. Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (development)
   - **Authorization callback URL**: `http://localhost:3000/auth/github`
4. Click **Register application**
5. Generate a new client secret

### 2. Configure Module

Add GitHub configuration to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nuxtAegis: {
    providers: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
  },
})
```

### 3. Environment Variables

Add your GitHub credentials to `.env`:

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 4. Create Server Route

Create an event handler for GitHub OAuth:

```typescript
// server/routes/auth/github.get.ts
export default defineOAuthGitHubEventHandler({
  config: {
    scopes: ['read:user', 'user:email'],
  },
})
```

## Scopes

Common GitHub OAuth scopes:

| Scope | Description |
|-------|-------------|
| `read:user` | Read user profile data |
| `user:email` | Access user email addresses |
| `repo` | Full control of repositories |
| `public_repo` | Access public repositories |
| `gist` | Access gists |

[View all GitHub OAuth scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)

## Authorization Parameters

### Allow Signup

Allow users to create a new GitHub account during OAuth:

```typescript
export default defineOAuthGitHubEventHandler({
  config: {
    scopes: ['read:user', 'user:email'],
    authorizationParams: {
      allow_signup: 'true',
    },
  },
})
```

## User Data

The GitHub provider returns user information in this format:

```typescript
{
  login: 'johndoe',
  id: 1234567,
  avatar_url: 'https://avatars.githubusercontent.com/u/1234567',
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software Developer',
  company: 'Acme Corp',
  location: 'San Francisco, CA',
  hireable: true,
  public_repos: 42,
  followers: 100,
  following: 50,
  created_at: '2020-01-01T00:00:00Z'
}
```

::: tip Email Access
To access the user's email, you must request the `user:email` scope. GitHub may return multiple emails; the primary email has `primary: true`.
:::

## Next Steps

- [Add custom claims](/guides/custom-claims)
- [Protect routes](/guides/route-protection)
