import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, url as getUrl } from '@nuxt/test-utils/e2e'
import {
  extractCodeFromUrl,
  decodeJwt,
} from './helpers/mockAuth'

describe('Aegis Module - Mock Google OAuth Impersonation', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/google-mock', import.meta.url)),
    dev: true,
  })

  it('restores the original user using originalUserLookupClaim instead of sub', async () => {
    const baseUrl = getUrl('/')

    const authResponse = await fetch(`${baseUrl}auth/google?user=admin`, {
      redirect: 'manual',
    })
    const authorizeUrl = authResponse.headers.get('location')!

    const mockAuthorizeResponse = await fetch(authorizeUrl, {
      redirect: 'manual',
    })
    const callbackUrl = mockAuthorizeResponse.headers.get('location')!

    const finalResponse = await fetch(callbackUrl, {
      redirect: 'manual',
    })
    const finalLocation = finalResponse.headers.get('location')!
    const aegisCode = extractCodeFromUrl(finalLocation)!

    const tokenResponse = await fetch(`${baseUrl}auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: aegisCode }),
    })
    const tokenData = await tokenResponse.json()
    const adminAccessToken = tokenData.accessToken as string
    const adminPayload = decodeJwt(adminAccessToken)

    expect(adminPayload.sub).toBe('mock-admin-001')
    expect(adminPayload.userId).toBe('91B9433E-F36B-1410-8782-0040B859207F')
    expect(adminPayload.role).toBe('ADMIN')

    const impersonateResponse = await fetch(`${baseUrl}auth/impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAccessToken}`,
      },
      body: JSON.stringify({
        targetUserId: '4C2E433E-F36B-1410-8780-0040B859207F',
        reason: 'test restore lookup',
      }),
    })
    const impersonateData = await impersonateResponse.json()
    const impersonatedAccessToken = impersonateData.accessToken as string
    const impersonatedPayload = decodeJwt(impersonatedAccessToken)

    expect(impersonatedPayload.sub).toBe('4C2E433E-F36B-1410-8780-0040B859207F')
    expect(impersonatedPayload.role).toBe('USER')
    expect(impersonatedPayload.impersonation).toMatchObject({
      originalUserSub: 'mock-admin-001',
      originalUserLookupId: '91B9433E-F36B-1410-8782-0040B859207F',
      originalUserEmail: 'admin@paprbck.local',
      originalUserName: 'Admin User',
    })

    const unimpersonateResponse = await fetch(`${baseUrl}auth/unimpersonate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${impersonatedAccessToken}`,
      },
    })
    const unimpersonateData = await unimpersonateResponse.json()
    const restoredAccessToken = unimpersonateData.accessToken as string
    const restoredPayload = decodeJwt(restoredAccessToken)

    expect(restoredPayload.sub).toBe('mock-admin-001')
    expect(restoredPayload.userId).toBe('91B9433E-F36B-1410-8782-0040B859207F')
    expect(restoredPayload.role).toBe('ADMIN')
    expect(restoredPayload.impersonation).toBeUndefined()

    const setCookie = unimpersonateResponse.headers.get('set-cookie')
    expect(setCookie).toContain('nuxt-aegis-refresh=')
  })
})
