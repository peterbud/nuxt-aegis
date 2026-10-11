import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, createPage, url } from '@nuxt/test-utils/e2e'
import { extractCodeFromUrl, parseCookie } from './helpers/mockAuth'

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
    browser: true,
  })

  it('supports authenticated useAegisFetch, call-site keys, and hydration reuse', async () => {
    const auth = await fetch(url('/auth/google'), { redirect: 'manual' })
    const authorize = await fetch(new URL(auth.headers.get('location')!, url('/')), { redirect: 'manual' })
    const callback = await fetch(new URL(authorize.headers.get('location')!, url('/')), { redirect: 'manual' })
    const token = await fetch(url('/auth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: extractCodeFromUrl(callback.headers.get('location')!) }),
    })
    expect(token.status).toBe(200)
    const cookie = parseCookie(token.headers.get('set-cookie'), 'nuxt-aegis-refresh')
    expect(cookie).toBeTruthy()
    const page = await createPage()
    try {
      await page.context().addCookies([{ name: 'nuxt-aegis-refresh', value: cookie!, url: url('/') }])
      const requests: string[] = []
      page.on('request', request => {
        if (new URL(request.url()).pathname === '/api/aegis-fetch') requests.push(request.url())
      })
      const response = await page.goto(url('/aegis-fetch'))
      const html = await response!.text()
      expect(html).toContain('id="email">test@example.com')
      expect(html).toContain('id="distinct">true')
      expect(html).toContain('id="shared">true')
      expect(html).not.toContain('Bearer ')
      await page.waitForFunction(() => document.querySelector('#mounted')?.textContent === 'true')
      expect(await page.textContent('#email')).toBe('test@example.com')
      expect(await page.textContent('#status')).toBe('success')
      expect(await page.textContent('#distinct')).toBe('true')
      expect(await page.textContent('#shared')).toBe('true')
      const firstId = await page.textContent('#first-id')
      expect(firstId).toBeTruthy()
      expect(await page.textContent('#second-id')).not.toBe(firstId)
      expect(html).toContain(`id="first-id">${firstId}`)
      expect(requests).toHaveLength(0)
      expect(JSON.parse((await page.textContent('#options'))!)).toEqual({ email: 'test@example.com', label: 'OPTIONS' })
      expect(await page.textContent('#deferred')).toBe('default')

      await page.click('#execute')
      await page.waitForFunction(() => document.querySelector('#deferred-email')?.textContent === 'test@example.com')
      await page.click('#refresh')
      await page.waitForFunction(previous => document.querySelector('#first-id')?.textContent !== previous, firstId)
      await page.click('#query')
      await page.waitForFunction(() => document.querySelector('#options')?.textContent?.includes('CHANGED'))
      expect(requests).toHaveLength(3)
      await page.click('#clear')
      await page.waitForFunction(() => document.querySelector('#deferred')?.textContent === 'default')
    }
    finally {
      await page.close()
    }
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
