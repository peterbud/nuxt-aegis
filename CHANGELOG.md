# Changelog

## v1.1.0-beta.1

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.8...v1.1.0-beta.1)

### 🚀 Enhancements

- Update requirements to support Nuxt 4.6.0 and Node.js 24.15.0 or higher ([a6881bc](https://github.com/peterbud/nuxt-aegis/commit/a6881bc))
- Migrate request handling to `nuxt/server` ([e4e649e](https://github.com/peterbud/nuxt-aegis/commit/e4e649e))
- Add `useAegisFetch` ([2d45ec6](https://github.com/peterbud/nuxt-aegis/commit/2d45ec6))
- Add cleanup task for expired authorization codes with tests ([4d76cdf](https://github.com/peterbud/nuxt-aegis/commit/4d76cdf))
- Implement OAuth transaction management and validation ([4df6730](https://github.com/peterbud/nuxt-aegis/commit/4df6730))
- Enhance and restructure type imports ([b1308c7](https://github.com/peterbud/nuxt-aegis/commit/b1308c7))
- **auth:** Enhance error handling and token refresh logic ([31011ab](https://github.com/peterbud/nuxt-aegis/commit/31011ab))
- **ci:** Add Chromium installation step for browser integration tests ([2337ce7](https://github.com/peterbud/nuxt-aegis/commit/2337ce7))

### 🩹 Fixes

- Cleanup task scheduling configuration based on config ([2913f7f](https://github.com/peterbud/nuxt-aegis/commit/2913f7f))
- Optimize  middleware logging ([5e52cd9](https://github.com/peterbud/nuxt-aegis/commit/5e52cd9))
- Update type assertion in createEvent function ([2b2861f](https://github.com/peterbud/nuxt-aegis/commit/2b2861f))
- Implement process-local consumption guard for authorization codes ([1405953](https://github.com/peterbud/nuxt-aegis/commit/1405953))

### 💅 Refactors

- Improve type safety ([e3968ed](https://github.com/peterbud/nuxt-aegis/commit/e3968ed))
- Contain Nitro dependencies ([2cced11](https://github.com/peterbud/nuxt-aegis/commit/2cced11))
- Remove providerTokens from the authorization-code record ([dc77e88](https://github.com/peterbud/nuxt-aegis/commit/dc77e88))
- Remove custom provider documentation and references ([e7404be](https://github.com/peterbud/nuxt-aegis/commit/e7404be))
- Restructure playground ([0253d27](https://github.com/peterbud/nuxt-aegis/commit/0253d27))

### 📖 Documentation

- Refactor and review all architecture docs ([6c15b4f](https://github.com/peterbud/nuxt-aegis/commit/6c15b4f))
- Update README ([3cb2999](https://github.com/peterbud/nuxt-aegis/commit/3cb2999))
- Update compatibility requirements ([e13825a](https://github.com/peterbud/nuxt-aegis/commit/e13825a))
- Refresh and review API docs ([b199d30](https://github.com/peterbud/nuxt-aegis/commit/b199d30))
- Clarify refresh token generation process in authentication flow ([9940cdd](https://github.com/peterbud/nuxt-aegis/commit/9940cdd))

### ✅ Tests

- Remove browser test ([118be88](https://github.com/peterbud/nuxt-aegis/commit/118be88))

### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.8

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.7...v1.1.0-alpha.8)

### 🚀 Enhancements

- Enhance useAuth composable with explicit auth status and resolution handling ([d8ace36](https://github.com/peterbud/nuxt-aegis/commit/d8ace36))

### 🩹 Fixes

- Update setup configuration to use server mode for redirect tests ([f139eaa](https://github.com/peterbud/nuxt-aegis/commit/f139eaa))

### 🏡 Chore

- Lint ([8b9abc3](https://github.com/peterbud/nuxt-aegis/commit/8b9abc3))

### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.7

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.6...v1.1.0-alpha.7)

### 🚀 Enhancements

- Implement custom redirect handling in OAuth flow ([955b9fa](https://github.com/peterbud/nuxt-aegis/commit/955b9fa))

### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.6

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.5...v1.1.0-alpha.6)

### 💅 Refactors

- Update test configuration by removing poolOptions and adjusting sequence settings ([aa22bf7](https://github.com/peterbud/nuxt-aegis/commit/aa22bf7))

### 📖 Documentation

- Unify environment variable names for token management ([891ac27](https://github.com/peterbud/nuxt-aegis/commit/891ac27))

### 🏡 Chore

- Update dependencies ([3b3d1b3](https://github.com/peterbud/nuxt-aegis/commit/3b3d1b3))
- Run pnpm dedupe ([e3ef071](https://github.com/peterbud/nuxt-aegis/commit/e3ef071))

### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.5

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.4...v1.1.0-alpha.5)

### 🚀 Enhancements

- Enhance impersonation feature with original user lookup claim and related updates ([c7f9c17](https://github.com/peterbud/nuxt-aegis/commit/c7f9c17))

### 📖 Documentation

- Add 'Updating Claims' section and extend security considerations ([968a1e7](https://github.com/peterbud/nuxt-aegis/commit/968a1e7))

### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.4

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.3...v1.1.0-alpha.4)

### 🚀 Enhancements

- Add minimal E2E test suite for nuxt-aegis authentication flow ([5c156be](https://github.com/peterbud/nuxt-aegis/commit/5c156be))
- Add claims update functionality ([494e9fd](https://github.com/peterbud/nuxt-aegis/commit/494e9fd))

### 🩹 Fixes

- Don't throw warning at prepare ([3f06b89](https://github.com/peterbud/nuxt-aegis/commit/3f06b89))
- Make loggedOutRedirectTo optional in ClientMiddlewareConfig ([cee00ff](https://github.com/peterbud/nuxt-aegis/commit/cee00ff))

### 🏡 Chore

- Update dependencies ([ee91d93](https://github.com/peterbud/nuxt-aegis/commit/ee91d93))

### Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.3

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.2...v1.1.0-alpha.3)

### 🚀 Enhancements

- Add e2e tests example with mock users ([d88a9f7](https://github.com/peterbud/nuxt-aegis/commit/d88a9f7))
- Implement refresh token rotation feature with configuration options ([c334046](https://github.com/peterbud/nuxt-aegis/commit/c334046))
- Add optional authentication for public routes ([b61a6df](https://github.com/peterbud/nuxt-aegis/commit/b61a6df))

### 💅 Refactors

- Use object syntax at plugin setup and standardize names ([6c63ec1](https://github.com/peterbud/nuxt-aegis/commit/6c63ec1))
- Turn encryption validation error to warning ([a88ab88](https://github.com/peterbud/nuxt-aegis/commit/a88ab88))
- Streamline access token management by importing functions directly ([b204e32](https://github.com/peterbud/nuxt-aegis/commit/b204e32))

### 📖 Documentation

- Update CustomTokenClaims type formatting ([76a7059](https://github.com/peterbud/nuxt-aegis/commit/76a7059))
- Remove incorrect storage configuration for refresh tokens ([9b88819](https://github.com/peterbud/nuxt-aegis/commit/9b88819))

### 🏡 Chore

- Update dependencies ([afaac84](https://github.com/peterbud/nuxt-aegis/commit/afaac84))

### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

## v1.1.0-alpha.2

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha.1...v1.1.0-alpha.2)

### 🩹 Fixes

- Nitro type augmentation ([e6e9f58](https://github.com/peterbud/nuxt-aegis/commit/e6e9f58))
- Include custom claims persistence for token refresh ([1db3d03](https://github.com/peterbud/nuxt-aegis/commit/1db3d03))
- Add ambient types for nitro hooks ([a2a9515](https://github.com/peterbud/nuxt-aegis/commit/a2a9515))

### 💅 Refactors

- Rename TokenPayload to BaseTokenClaims for clarity and consistency ([3a7b3d4](https://github.com/peterbud/nuxt-aegis/commit/3a7b3d4))
- Unify user persistence with onUserPersist handler for password and OAuth providers ([35c3bf8](https://github.com/peterbud/nuxt-aegis/commit/35c3bf8))

### 📖 Documentation

- Update environment variable prefixes for consistency and clarity ([ad27885](https://github.com/peterbud/nuxt-aegis/commit/ad27885))
- Update login and logout method signatures ([cc14ae0](https://github.com/peterbud/nuxt-aegis/commit/cc14ae0))
- Update composable definitions and route protection documents ([dfa97d6](https://github.com/peterbud/nuxt-aegis/commit/dfa97d6))

### 🏡 Chore

- Update dependencies in minimal example ([3ad6afe](https://github.com/peterbud/nuxt-aegis/commit/3ad6afe))
- Update README for the minimal example ([e705fcf](https://github.com/peterbud/nuxt-aegis/commit/e705fcf))

## v1.1.0-alpha.1

[compare changes](https://github.com/peterbud/nuxt-aegis/compare/v1.1.0-alpha...v1.1.0-alpha.1)

### 🚀 Enhancements

- Update reference to published package in minimal example ([bd5f3e8](https://github.com/peterbud/nuxt-aegis/commit/bd5f3e8))

### 🩹 Fixes

- Update getAuthUser function to return null instead of throwing an error for unauthorized access ([138b438](https://github.com/peterbud/nuxt-aegis/commit/138b438))

### 💅 Refactors

- Type augmentation ([7c539d7](https://github.com/peterbud/nuxt-aegis/commit/7c539d7))
- Export types properly in '#build/nuxt-aegis' ([1f4dc69](https://github.com/peterbud/nuxt-aegis/commit/1f4dc69))

### 📦 Build

- Add documentation deployment workflow ([c857e53](https://github.com/peterbud/nuxt-aegis/commit/c857e53))
- Update deployment workflow to trigger on version tags ([74224b0](https://github.com/peterbud/nuxt-aegis/commit/74224b0))
- Add project setup step in docs deployment workflow ([904ab48](https://github.com/peterbud/nuxt-aegis/commit/904ab48))
- Set base path for docs ([146af98](https://github.com/peterbud/nuxt-aegis/commit/146af98))

## v1.1.0-alpha


### 🚀 Enhancements

- First alpha release of nuxt-aegis module
  
### ❤️ Contributors

- Peter Budai <peterbudai@hotmail.com>

