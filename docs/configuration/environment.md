# Environment Variables

Configure Nuxt Aegis using environment variables for secure credential management.

## Variables

`NUXT_NUXT_AEGIS_TOKEN_SECRET` is always required. The provider variables are only required for the providers you use.

- The `NUXT_` prefix is required for Nuxt to map these variables onto the runtime config
- The runtime config key of the module is `nuxtAegis`, so every variable starts with `NUXT_NUXT_AEGIS_`

```dotenv

# JWT Token Secret (at least 32 characters recommended)
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

::: info Missing secrets are reported
On Nuxt 4.7 and later, the module declares `token.secret`, `tokenRefresh.encryption.key` (when encryption is enabled) and the `clientId`/`clientSecret` of the Google, Microsoft, GitHub and Auth0 providers as required runtime config values. If one is not set in `nuxt.config` or by an environment variable, Nuxt prints a warning at startup. The warning becomes an error with `future.compatibilityVersion: 5`. To always fail on a missing secret, declare your own schema for it in `runtimeConfig.nuxtAegis`. A schema you declare takes precedence over the module's.
:::

::: tip Generating Secure Secrets
Use OpenSSL to generate cryptographically secure secrets:

```bash
# Generate JWT token secret (44 characters)
openssl rand -base64 32

# Generate encryption key (44 characters, only the first 32 are used)
openssl rand -base64 32
```
:::

## Accessing Environment Variables

Nuxt maps environment variables with the `NUXT_` prefix onto the runtime config at runtime, so you do not need to reference them in `nuxt.config.ts`. The variable name is `NUXT_` followed by the config path in upper snake case, for example `nuxtAegis.tokenRefresh.encryption.key` becomes `NUXT_NUXT_AEGIS_TOKEN_REFRESH_ENCRYPTION_KEY`.

Alternatively, you can wire your own env variables directly in your `nuxt.config.ts`. These are read at build time:

```typescript
// In nuxt.config.ts
export default defineNuxtConfig({
  nuxtAegis: {
    token: {
      secret: process.env.MY_TOKEN_SECRET!,
    },
    providers: {
      google: {
        clientId: process.env.MY_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.MY_GOOGLE_CLIENT_SECRET!,
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
