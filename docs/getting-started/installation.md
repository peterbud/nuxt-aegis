# Installation

Get started with Nuxt Aegis in just a few steps.

## Add the Module

Install Nuxt Aegis to your Nuxt application using the Nuxt CLI:

```bash
npx nuxi module add @peterbud/nuxt-aegis
```

This command will:
1. Install the `@peterbud/nuxt-aegis` package
2. Add it to your `nuxt.config.ts` modules array

## Environment Variables

Create a `.env` file in your project root and add the required environment variables:

```bash
# Required: Secret for signing JWT tokens (32+ characters recommended)
NUXT_AEGIS_TOKEN_SECRET=your-super-secret-key-minimum-32-characters

# OAuth Provider Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Encryption key for refresh token storage (32+ characters)
NUXT_AEGIS_ENCRYPTION_KEY=your-encryption-key-minimum-32-characters
```

::: danger Never Commit Secrets
Never commit your `.env` file or any secrets to version control. Add `.env` to your `.gitignore` file.
:::

::: tip Generate Strong Secrets
Use a cryptographically secure random string generator to create your secrets. They should be at least 32 characters long.

```bash
# Generate a secure random string on macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
:::

## Next Steps

Now that you have Nuxt Aegis installed, proceed to the [Quick Start](/getting-started/quick-start) guide to configure your first authentication provider.
