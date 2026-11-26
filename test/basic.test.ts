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
})
