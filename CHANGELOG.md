# Changelog


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

