import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('basic', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    dev: true,
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain('basic')
    expect(html).toContain('<span id="distinct">true</span>')
    expect(html).toContain('<span id="app-exports">useAegisFetch,useAuth</span>')
    expect(html).toContain('<span id="app-auto-imports">true</span>')
  })

  it('exposes only the named server API and matching auto-imports', async () => {
    const response = await $fetch<{ exports: string[], autoImportsMatch: boolean }>('/api/imports')
    expect(response.autoImportsMatch).toBe(true)
    expect(response.exports).toEqual([
      'defineAegisHandler',
      'defineOAuthAuth0EventHandler',
      'defineOAuthEventHandler',
      'defineOAuthGithubEventHandler',
      'defineOAuthGoogleEventHandler',
      'defineOAuthMockEventHandler',
      'defineOAuthProvider',
      'deleteUserRefreshTokens',
      'generateAuthTokens',
      'getAuthUser',
      'recomputeCustomClaims',
      'requireAuth',
      'revokeRefreshToken',
      'useAegisHandler',
    ].sort())
  })

  it('generates only the provider factory allowlist as server globals', async () => {
    const declarations = await readFile(new URL('./fixtures/basic/.nuxt/types/nitro-imports.d.ts', import.meta.url), 'utf8')
    expect(declarations).not.toMatch(/\bverifyToken\b/)
    const providerGlobals = [...declarations.matchAll(/(?:const|var) (\w+): typeof import\([^\n]*\/providers\//g)].map(match => match[1])
    expect(providerGlobals.sort()).toEqual([
      'defineOAuthAuth0EventHandler',
      'defineOAuthGithubEventHandler',
      'defineOAuthGoogleEventHandler',
      'defineOAuthMockEventHandler',
    ])
    for (const name of ['OAuthProviderImplementation', 'AegisHandler', 'UserPersistContext', 'defineOAuthProvider', 'defineOAuthEventHandler', 'validateAuthorizationParams']) {
      expect(declarations).not.toMatch(new RegExp(`\\b(?:const|var|type|interface) ${name}\\b`))
    }
  })

  it('registers exact aliases in each required type context without the root alias', async () => {
    for (const context of ['app', 'server', 'shared', 'node']) {
      const config = JSON.parse(await readFile(new URL(`./fixtures/basic/.nuxt/tsconfig.${context}.json`, import.meta.url), 'utf8'))
      const paths = config.compilerOptions.paths
      expect(paths['#nuxt-aegis/types']).toHaveLength(1)
      if (context === 'app') {
        expect(paths['#nuxt-aegis/app']).toHaveLength(1)
      }
      if (context === 'server') {
        expect(paths['#nuxt-aegis/server']).toHaveLength(1)
      }
      expect(paths).not.toHaveProperty('#nuxt-aegis')
      expect(paths).not.toHaveProperty('#nuxt-aegis/*')
      expect(paths).not.toHaveProperty('#nuxt-aegis/server/providers')
    }
  })

  it('preserves app-only and common augmentation registration boundaries', async () => {
    const app = await readFile(new URL('./fixtures/basic/.nuxt/nuxt.d.ts', import.meta.url), 'utf8')
    const server = await readFile(new URL('./fixtures/basic/.nuxt/types/nitro-nuxt.d.ts', import.meta.url), 'utf8')
    const node = await readFile(new URL('./fixtures/basic/.nuxt/nuxt.node.d.ts', import.meta.url), 'utf8')
    const shared = await readFile(new URL('./fixtures/basic/.nuxt/nuxt.shared.d.ts', import.meta.url), 'utf8')
    expect(app).toContain('nuxt-aegis-app.d.ts')
    for (const declarations of [server, node, shared]) {
      expect(declarations).not.toContain('nuxt-aegis-app.d.ts')
    }
    for (const declarations of [app, server, node]) {
      expect(declarations).toContain('nuxt-aegis.d.ts')
    }
  })
})
