# Nuxt Aegis

[![Build](https://github.com/peterbud/nuxt-aegis/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/peterbud/nuxt-aegis/actions/workflows/ci.yml)
[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

**Authentication for Nuxt 4.6+, from local testing to authenticated API calls.**

Nuxt Aegis is a Nuxt module that orchestrates the authentication flow between external identity providers (Google, GitHub, Auth0, etc.) and your application. It handles OAuth 2.0, JWT token generation, and automatic token refresh, letting you focus on your application logic.

Use auto-imported composables for auth state and data fetching, and the provided `$api` for authenticated requests. Develop and test with mock user personas before setting up an external provider, then use opt-in impersonation to investigate user-specific issues.

> [!WARNING]
> **Experimental Module**: Nuxt Aegis is currently in active development and should be considered as work in progress. It is **not recommended for production use** at this time. APIs and features may change without notice.

## Why Nuxt Aegis?

Unlike cookie-based solutions that lock your API to the browser, Nuxt Aegis uses **industry-standard JWT bearer tokens**. This means your API is ready for:
- 📱 Mobile applications
- 🖥️ CLI tools
- 🌐 Third-party integrations
- ⚡ Universal access across platforms

### How It Works

1. **Authentication (Identity) Provider** (e.g., Google) authenticates the user.
2. **Nuxt Aegis** verifies the identity retrieves the user information, and issues it's own application specific JWT.
3. **Your App** receives the JWT token and uses it for authorization.

You get full control over user data persistence while Aegis handles the security lifecycle.

## ✨ Key Features

- 🔐 **OAuth 2.0 & OpenID Connect** - Built-in support for Google, GitHub, Auth0, and Microsoft Entra ID.
- 🔑 **Password Authentication** - Secure username/password flow with magic link verification.
- 🎫 **JWT Management** - Automatic token generation, validation, and signing with HS256 by default.
- 🔄 **Auto-Refresh** - Seamless background token refresh with secure HTTP-only cookies.
- **Authenticated Fetch** - `$api` and auto-imported `useAegisFetch()` attach bearer tokens and handle client-side refresh/retry when automatic refresh is enabled.
- 🛡️ **Route Protection** - Declarative middleware for both server API routes and client-side pages.
- 🧪 **Mock Provider** - Test real auth flows with configurable user personas and simulated OAuth errors, without external provider credentials.
- 🎨 **Custom Claims** - Easily inject application-specific data (roles, permissions or similar) into tokens.
- 🎭 **Impersonation** - Opt-in, short-lived sessions for support, debugging, and testing, with application-defined authorization and audit hooks.
- ⚙️ **SSR Friendly** - Works seamlessly with Nuxt's server-side rendering.
- 🥽 **Type Safe** - Typed auth state, custom claims, and fetch responses, with Nuxt auto-imports to keep application code concise.

## Compatibility

The module requires Nuxt 4.6.0 or newer within Nuxt 4, and Node.js `^24.15.0 || >=26.0.0`. Nuxt 3, older Nuxt 4 releases are not supported; Nuxt 5 has not yet been validated.

OAuth login currently supports single-process deployments only. CLI OAuth login and shared transaction storage are not yet supported (see [OAuth storage limits](https://peterbud.github.io/nuxt-aegis/configuration/storage.md#oauth-login-transactions)); bearer-token API access is unaffected.

## 🚀 Quick Start

### 1. Install

```bash
npx nuxi module add @peterbud/nuxt-aegis
```

### 2. Configure

Add the module and provider configuration to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@peterbud/nuxt-aegis'],
  
  nuxtAegis: {
    token: {
      secret: process.env.NUXT_NUXT_AEGIS_TOKEN_SECRET!,
    },
    providers: {
      google: {
        clientId: process.env.NUXT_NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.NUXT_NUXT_AEGIS_PROVIDERS_GOOGLE_CLIENT_SECRET!,
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

For authenticated API calls, use `const { $api } = useNuxtApp()`. For reactive, SSR-aware data fetching, use the auto-imported `useAegisFetch()`. Both reuse Aegis token handling, so you don't need to wire up authorization headers yourself. See the [authenticated fetch reference](https://peterbud.github.io/nuxt-aegis/api/fetch-plugin).

## 📖 Documentation

Ready to dive deeper? Check out the full documentation:

- **[Documentation Home](https://peterbud.github.io/nuxt-aegis/)** - Main documentation site.
- **[Getting Started](https://peterbud.github.io/nuxt-aegis/getting-started/installation)** - Installation and setup guides.
- **[Architecture](https://peterbud.github.io/nuxt-aegis/architecture/)** - Overview of the system architecture.
- **[Providers](https://peterbud.github.io/nuxt-aegis/providers/)** - Configure Google, GitHub, Auth0, Password, and Mock providers.
- **[Configuration](https://peterbud.github.io/nuxt-aegis/configuration/)** - Detailed configuration options.
- **[Route Protection](https://peterbud.github.io/nuxt-aegis/guides/route-protection)** - Learn how to protect your pages and API routes.
- **[Custom Claims](https://peterbud.github.io/nuxt-aegis/guides/custom-claims)** - Add custom data to your JWTs.
- **[Mock Provider](https://peterbud.github.io/nuxt-aegis/providers/mock)** - Test user personas, OAuth failures, and authentication flows locally.
- **[Impersonation](https://peterbud.github.io/nuxt-aegis/guides/impersonation)** - Diagnose user-specific issues with short-lived impersonation sessions.
- **[API Reference](https://peterbud.github.io/nuxt-aegis/api/)** - Detailed API documentation.

## Contributing

Contributions are welcome! Please see the [Requirements Specification](/specs/requirements.md) for detailed technical requirements.

<details>
<summary>Local development</summary>

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
</details>

If you want to report a bug, please make sure you have a minimal reproduction of the issue. You can use the [minimal example](https://stackblitz.com/github/peterbud/nuxt-aegis/tree/main/examples/minimal?title=Nuxt-Aegis%20Minimal%20Example) to create a reproduction.


## License

[MIT License](./LICENSE)

## Acknowledgments

- Built with [Nuxt Module Builder](https://github.com/nuxt/module-builder)
- JWT handling powered by [jose](https://github.com/panva/jose)
- Heavily inspired by the [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) and  Nuxt community

Made with ❤️ for the Nuxt community

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-aegis/latest.svg\?style\=flat\&colorA\=020420\&colorB\=00DC82
[npm-version-href]: https://npmjs.com/package/@peterbud/nuxt-aegis

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-aegis.svg\?style\=flat\&colorA\=020420\&colorB\=00DC82
[npm-downloads-href]: https://npm.chart.dev/@peterbud/nuxt-aegis

[license-src]: https://img.shields.io/npm/l/nuxt-aegis.svg\?style\=flat\&colorA\=020420\&colorB\=00DC82
[license-href]: https://npmjs.com/package/@peterbud/nuxt-aegis

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420\?logo\=nuxt.js
[nuxt-href]: https://nuxt.com
