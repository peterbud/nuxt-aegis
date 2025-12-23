# Environment Variables

Configure Nuxt Aegis using environment variables for secure credential management.

## Required Variables

These environment variables are required for Nuxt Aegis to function properly.

- `NUXT_` prefix is required for Nuxt to expose these variables to the runtime config
- `NUXT_AEGIS` is the namespace used by nuxt-aegis module

```dotenv

# JWT Token Secret (minimum 32 characters)
NUXT_NUXT_AEGIS_TOKEN_SECRET=your-super-secret-jwt-signing-key-here-min-32-chars

# Google OAuth (if using Google provider)
NUXT_NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NUXT_NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

# Auth0 OAuth (if using Auth0 provider)
NUXT_NUXT_AEGIS_PROVIDERS_AUTH0_DOMAIN=your-tenant.auth0.com
NUXT_NUXT_AEGIS_PROVIDERS_AUTH0_CLIENT_ID=your-auth0-client-id
NUXT_NUXT_AEGIS_PROVIDERS_AUTH0_CLIENT_SECRET=your-auth0-client-secret

# GitHub OAuth (if using GitHub provider)
NUXT_NUXT_AEGIS_PROVIDERS_GITHUB_CLIENT_ID=Iv1.your-github-client-id
NUXT_NUXT_AEGIS_PROVIDERS_GITHUB_CLIENT_SECRET=your-github-client-secret
```

::: danger Never Commit Secrets
Never commit environment variables containing secrets to version control. Use `.env` files for local development and secure secret management in production.
:::

::: tip Generating Secure Secrets
Use OpenSSL to generate cryptographically secure secrets:

```bash
# Generate JWT token secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (32+ characters)
openssl rand -base64 32
```
:::

## Accessing Environment Variables

Environment variables are automatically loaded by Nuxt if you use the `NUXT_` prefix. Alternatively, you can wire your env variable directly in your `nuxt.config.ts`:

```typescript
// In nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_AEGIS_TOKEN_SECRET!,
    },
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  },
})
```

## Security Best Practices

::: danger Production Security
- Use environment variable injection (not `.env` files) in production
- Rotate secrets regularly (every 90 days recommended)
- Use different secrets for each environment
- Never log or expose secrets in error messages
- Use secret management services (Azure Keyvault, AWS Secrets Manager, HashiCorp Vault)
:::

## Next Steps

- [Configure storage backends](/configuration/storage)
- [Set up OAuth providers](/providers/)
- [Learn about security best practices](/security/best-practices)
