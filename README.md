# Nuxt Aegis

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

**OAuth-based authentication with JWT token management for Nuxt 3/4**

Nuxt Aegis is a comprehensive authentication module that orchestrates the flow between external providers (Google, GitHub, Auth0, etc.) and your application. It handles the complexity of OAuth 2.0, JWT token generation, and automatic token refresh, letting you focus on your application logic.


## Why Nuxt Aegis?

Unlike cookie-based solutions that lock your API to the browser, Nuxt Aegis uses **industry-standard JWT bearer tokens**. This means your API is ready for:
- 📱 Mobile applications
- 🖥️ CLI tools
- 🌐 Third-party integrations
- ⚡ Universal access across platforms

### How It Works

1. **Authentication Provider** (e.g., Google) authenticates the user.
2. **Nuxt Aegis** verifies the identity and issues a JWT.
3. **Your App** receives the token and uses it for authorization.

You get full control over user data persistence while Aegis handles the security lifecycle.

## ✨ Key Features

- 🔐 **OAuth 2.0 & OpenID Connect** - Built-in support for Google, GitHub, Auth0, and Microsoft Entra ID.
- 🔑 **Password Authentication** - Secure username/password flow with magic link verification.
- 🎫 **JWT Management** - Automatic token generation, validation, and signing (HS256/RS256).
- 🔄 **Auto-Refresh** - Seamless background token refresh with secure HTTP-only cookies.
- 🛡️ **Route Protection** - Declarative middleware for both server API routes and client-side pages.
- 🧪 **Mock Provider** - Built-in testing provider to simulate auth flows without external services.
- 🎨 **Custom Claims** - Easily inject application-specific data (roles, permissions or similar) into tokens.
- 🎭 **Impersonation** - Support for user impersonation with full audit logging
- 🥽 **Type Safe** - Written in TypeScript with full type definitions for a great developer experience.

## 🚀 Quick Start

### 1. Install

```bash
npx nuxi module add nuxt-aegis
```

### 2. Configure

Add the module and provider configuration to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-aegis'],
  
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

### 3. Create Auth Route

Create a server route handler to initialize the provider:

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  onUserInfo: (providerUserInfo, _tokens, _event) => {
    return {
      id: providerUserInfo.sub as string,
      email: providerUserInfo.email,
      name: providerUserInfo.name,
    }
  },
})
```

### 4. Use in Components

Access authentication state anywhere in your app:

```vue
<script setup lang="ts">
const { user, isLoggedIn, login, logout } = useAuth()
</script>

<template>
  <div v-if="isLoggedIn">
    <h1>Welcome, {{ user?.name }}!</h1>
    <button @click="logout()">Logout</button>
  </div>
  <button v-else @click="login('google')">
    Login with Google
  </button>
</template>
```

## 📖 Documentation

Ready to dive deeper? Check out the full documentation:

- **[Getting Started](./docs/getting-started/installation.md)** - Installation and setup guides.
- **[Providers](./docs/providers/)** - Configure Google, GitHub, Auth0, Password, and Mock providers.
- **[Route Protection](./docs/guides/route-protection.md)** - Learn how to protect your pages and API routes.
- **[Custom Claims](./docs/guides/custom-claims.md)** - Add custom data to your JWTs.
- **[API Reference](./docs/api/)** - Detailed API documentation.

## Contributing

Contributions are welcome! Please see the [Requirements Specification](/specs/requirements.md) for detailed technical requirements.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Lint & type check
pnpm lint
```

## License

[MIT License](./LICENSE)

## Acknowledgments

- Built with [Nuxt Module Builder](https://github.com/nuxt/module-builder)
- JWT handling powered by [jose](https://github.com/panva/jose)
- Heavily inspired by the [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) and  Nuxt community

Made with ❤️ for the Nuxt community

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-aegis/latest.svg\?style\=flat\&colorA\=020420\&colorB\=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-aegis

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-aegis.svg\?style\=flat\&colorA\=020420\&colorB\=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-aegis

[license-src]: https://img.shields.io/npm/l/nuxt-aegis.svg\?style\=flat\&colorA\=020420\&colorB\=00DC82
[license-href]: https://npmjs.com/package/nuxt-aegis

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420\?logo\=nuxt.js
[nuxt-href]: https://nuxt.com
