# Nuxt Aegis

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

**OAuth-based authentication with JWT token management for Nuxt 3/4**

A comprehensive authentication module providing OAuth 2.0, JWT tokens, automatic token refresh, and flexible route protection.

---

## 📖 Documentation

**[View Full Documentation →](./docs/)**

- [Getting Started](./docs/getting-started/installation.md)
- [Providers](./docs/providers/) - Google, Auth0, GitHub, Mock
- [Configuration](./docs/configuration/)
- [Usage Guides](./docs/guides/)
- [API Reference](./docs/api/)
- [Security Best Practices](./docs/security/best-practices.md)

---

## ✨ Features

- 🔐 **OAuth 2.0** - Google, Auth0, GitHub providers with extensible architecture
- 🎫 **JWT Tokens** - Automatic generation, validation, signing (HS256/RS256)
- 🔄 **Token Refresh** - Seamless automatic refresh with server-side storage
- 🛡️ **Route Protection** - Declarative middleware for server and client routes
- 🎨 **Custom Claims** - Add application-specific data to tokens
- 🍪 **Secure Cookies** - HttpOnly, secure, SameSite cookies for refresh tokens
- 🔌 **Extensible** - Easy to add custom OAuth providers
- 🥽 **Type Safe** - Full TypeScript support

## Quick Start

### 1. Install

```bash
npx nuxi module add nuxt-aegis
```

### 2. Configure

```typescript
// nuxt.config.ts
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

### 3. Environment Variables

```bash
# .env
NUXT_AEGIS_TOKEN_SECRET=your-32-character-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
```

### 4. Create OAuth Route

```typescript
// server/routes/auth/google.get.ts
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
  },
})
```

### 5. Use in Components

```vue
<script setup lang="ts">
const { user, isAuthenticated, login, logout } = useAuth()
</script>

<template>
  <div>
    <button v-if="!isAuthenticated" @click="login('google')">
      Login with Google
    </button>
    <div v-else>
      <p>Welcome, {{ user?.name }}!</p>
      <button @click="logout()">Logout</button>
    </div>
  </div>
</template>
```

That's it! ✨

## Documentation Overview

### Getting Started
- [Installation](./docs/getting-started/installation.md)
- [Quick Start Guide](./docs/getting-started/quick-start.md)

### Providers
- [Provider Overview](./docs/providers/)
- [Google OAuth](./docs/providers/google.md)
- [Auth0](./docs/providers/auth0.md)
- [GitHub](./docs/providers/github.md)
- [Mock Provider](./docs/providers/mock.md) (Development/Testing)
- [Custom Providers](./docs/providers/custom.md)

### Configuration
- [Configuration Reference](./docs/configuration/)
- [Environment Variables](./docs/configuration/environment.md)
- [Storage Backends](./docs/configuration/storage.md)

### Usage Guides
- [Client-Side Authentication](./docs/guides/client-auth.md)
- [Route Protection](./docs/guides/route-protection.md)
- [Custom Claims](./docs/guides/custom-claims.md)
- [Authentication Hooks](./docs/guides/hooks.md)
- [Token Refresh](./docs/guides/token-refresh.md)
- [Authorization CODE Flow](./docs/guides/authorization-code.md)

### API Reference
- [useAuth() Composable](./docs/api/composables.md)
- [HTTP Endpoints](./docs/api/endpoints.md)
- [Server Utilities](./docs/api/server-utils.md)
- [Event Handlers](./docs/api/event-handlers.md)
- [TypeScript Types](./docs/api/types.md)

### Architecture & Security
- [Architecture Overview](./docs/architecture/)
- [Security Overview](./docs/security/)
- [Security Best Practices](./docs/security/best-practices.md)

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
pnpm typecheck
```

## License

[MIT License](./LICENSE)

---

- ✨ [Release Notes](/CHANGELOG.md)
- 📖 [Full Documentation](./docs/)
- 📋 [Requirements Specification](/specs/requirements.md)
- 🐛 [Issue Tracker](https://github.com/peterbud/nuxt-aegis/issues)

---

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
