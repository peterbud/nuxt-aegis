const mock = {
  clientId: 'mock-playground-client',
  clientSecret: 'mock-playground-secret',
  mockUsers: {
    admin: {
      sub: 'mock-admin-001',
      email: 'admin@example.com',
      name: 'Admin User',
      given_name: 'Admin',
      family_name: 'User',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
      email_verified: true,
    },
    user: {
      sub: 'mock-user-002',
      email: 'user@example.com',
      name: 'Regular User',
      given_name: 'Regular',
      family_name: 'User',
      subscription: 'basic',
      role: 'user',
      permissions: ['read'],
      email_verified: true,
    },
    premium: {
      sub: 'mock-premium-003',
      email: 'premium@example.com',
      name: 'Premium User',
      subscription: 'premium',
      role: 'user',
      permissions: ['read'],
      email_verified: true,
    },
  },
  defaultUser: 'user',
}

export default defineNuxtConfig({
  modules: [
    '../src/module',
  ],
  $development: {
    nuxtAegis: {
      providers: {
        // Mock provider for development/testing (works without credentials)
        mock,
      },
    },
  },
  $test: {
    nuxtAegis: {
      providers: {
        // Mock provider for development/testing (works without credentials)
        mock,
      },
      token: {
        secret: 'test-secret-key-for-playground',
      },
    },
  },
  ssr: false,
  devtools: { enabled: true },
  compatibilityDate: '2025-10-04',
  // Server-side route protection via Nitro route rules
  nitro: {
    routeRules: {
      // Protect all API routes (server-side)
      '/api/**': { nuxtAegis: { auth: true } },
      // Public API routes override
      '/api/public/**': { nuxtAegis: { auth: false } },
    },
  },
  nuxtAegis: {
    providers: {
      google: {
        clientId: '',
        clientSecret: '',
      },
      github: {
        clientId: '',
        clientSecret: '',
      },
      auth0: {
        clientId: '',
        clientSecret: '',
        domain: '',
      },
      // Password provider for username/password authentication
      password: {
        magicCodeTTL: 600, // 10 minutes
        magicCodeMaxAttempts: 5,
        passwordHashRounds: 12,
        passwordPolicy: {
          minLength: 8,
        },
      },
    },
    token: {
      secret: '',
      expiresIn: '15m',
    },
    tokenRefresh: {
      enabled: true,
      automaticRefresh: true,
    },
    // Impersonation configuration (opt-in feature)
    impersonation: {
      enabled: true,
      tokenExpiration: 900, // 15 minutes for impersonated sessions
    },
    // Redirect configuration
    redirect: {
      logout: '/logout-success',
      error: '/auth-failed',
    },
    // Client-side middleware for route protection (optional)
    clientMiddleware: {
      enabled: true,
      global: false, // Don't protect all pages by default
      redirectTo: '/login',
      loggedOutRedirectTo: '/',
    },
  },
})
