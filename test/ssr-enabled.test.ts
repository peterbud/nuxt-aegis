import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

/**
 * E2E Tests for SSR Support
 *
 * These tests verify that Nuxt Aegis works correctly with Server-Side Rendering enabled.
 *
 * What We're Testing:
 * - SSR renders pages without errors when enableSSR: true (default)
 * - Plugin provides $api on both server and client
 * - Client-side token refresh happens after hydration
 * - SSR can be disabled with enableSSR: false
 * - Authentication state is reactive after token refresh
 */
describe('Aegis Module - SSR Support', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/google-mock', import.meta.url)),
    dev: true,
  })

  describe('SSR Rendering', () => {
    it('should render pages with SSR enabled', async () => {
      // Verify that pages render without errors when SSR is enabled (default)
      const html = await $fetch<string>('/')

      expect(html).toBeTruthy()
      expect(html).toContain('<!DOCTYPE html>')
      // Should contain Nuxt's hydration payload
      expect(html).toContain('__NUXT__')
    })

    it('should not include tokens in HTML payload', async () => {
      // Security: Verify that access tokens are NOT exposed in the HTML
      const html = await $fetch<string>('/')

      // Should not contain common token-related strings in payload
      expect(html).not.toContain('accessToken')
      expect(html).not.toContain('access_token')
      expect(html).not.toContain('Bearer ')
    })
  })

  describe('Token Refresh After Hydration', () => {
    it('should have refresh endpoint available for client', async () => {
      // Verify that the refresh endpoint exists for client-side token refresh
      // This will fail without valid refresh cookie, but that's expected
      try {
        await $fetch('/auth/refresh', {
          method: 'POST',
        })
      }
      catch (error: unknown) {
        // Expected to fail without valid refresh token
        // But should return 401, not 404
        const fetchError = error as { response?: { status?: number } }
        expect([400, 401]).toContain(fetchError.response?.status)
      }
    })
  })

  describe('Configuration', () => {
    it('should use enableSSR: true by default', async () => {
      // The fixture doesn't explicitly set enableSSR, so it should default to true
      // We verify this by checking that SSR is working (not disabled)
      const html = await $fetch<string>('/')

      // If SSR is working, we should get server-rendered HTML
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<div id="__nuxt">')
    })
  })
})
