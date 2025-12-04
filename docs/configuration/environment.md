# Environment Variables

Configure Nuxt Aegis using environment variables for secure credential management.

## Required Variables

These environment variables are required for Nuxt Aegis to function:

```dotenv
# JWT Token Secret (minimum 32 characters)
NUXT_AEGIS_TOKEN_SECRET=your-super-secret-jwt-signing-key-here-min-32-chars

# Google OAuth (if using Google provider)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

# Auth0 OAuth (if using Auth0 provider)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret

# GitHub OAuth (if using GitHub provider)
GITHUB_CLIENT_ID=Iv1.your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

::: danger Never Commit Secrets
Never commit environment variables containing secrets to version control. Use `.env` files for local development and secure secret management in production.
:::

## Optional Variables

These optional variables enable additional features:

```dotenv
# Encryption at Rest (for storing sensitive user data)
NUXT_AEGIS_ENCRYPTION_KEY=your-32-character-encryption-key

# Redis Storage (for production refresh token storage)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Custom Redirect URLs
NUXT_AEGIS_LOGOUT_REDIRECT=/goodbye
NUXT_AEGIS_SUCCESS_REDIRECT=/dashboard
NUXT_AEGIS_ERROR_REDIRECT=/auth-failed
```

## .env File Setup

Create a `.env` file in your project root:

```dotenv
# .env
NUXT_AEGIS_TOKEN_SECRET=generate-with-openssl-rand-base64-32
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

::: tip Generating Secure Secrets
Use OpenSSL to generate cryptographically secure secrets:

```bash
# Generate JWT token secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (32+ characters)
openssl rand -base64 32
```
:::

## .env.example Template

Create a `.env.example` file for your team:

```bash
# JWT Configuration
NUXT_AEGIS_TOKEN_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Auth0 OAuth
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Optional: Encryption
NUXT_AEGIS_ENCRYPTION_KEY=

# Optional: Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Environment-Specific Configuration

### Development Environment

Create `.env.development`:

```bash
NUXT_AEGIS_TOKEN_SECRET=dev-secret-minimum-32-characters-long
GOOGLE_CLIENT_ID=dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-dev-secret

# Allow HTTP in development
NUXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Production Environment

Set environment variables in your deployment platform:

::: code-group

```bash [Vercel]
# Set via Vercel dashboard or CLI
vercel env add NUXT_AEGIS_TOKEN_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
```

```bash [Netlify]
# Set via Netlify dashboard or CLI
netlify env:set NUXT_AEGIS_TOKEN_SECRET "your-secret"
netlify env:set GOOGLE_CLIENT_ID "your-client-id"
netlify env:set GOOGLE_CLIENT_SECRET "your-client-secret"
```

```bash [Docker]
# Use docker-compose.yml with env_file
services:
  app:
    environment:
      - NUXT_AEGIS_TOKEN_SECRET=${NUXT_AEGIS_TOKEN_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
```

:::

## Accessing Environment Variables

Environment variables are automatically loaded by Nuxt:

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
