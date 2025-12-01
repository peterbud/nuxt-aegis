import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { fileURLToPath } from 'node:url'

describe('Password Authentication', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/password-auth', import.meta.url)),
    server: true,
  })

  const email = 'test@example.com'
  const password = 'Password123!'
  let magicCode: string
  let sessionId: string
  let accessToken: string

  it('should register a new user', async () => {
    // 1. Register
    const registerRes = await fetch('/auth/password/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    expect(registerRes.status).toBe(200)
    expect(await registerRes.json()).toEqual({ success: true })

    // 2. Get magic code (from mock endpoint)
    const codeRes = await fetch(`/_test/last-code?email=${email}`)
    const codeData = await codeRes.json()
    magicCode = codeData.code
    expect(magicCode).toBeDefined()

    // 3. Verify registration
    const verifyRes = await fetch(`/auth/password/register-verify?code=${magicCode}`, {
      redirect: 'manual', // Don't follow redirects
    })
    expect(verifyRes.status).toBe(302)
    const location = verifyRes.headers.get('location')
    expect(location).toContain('/auth/callback?code=')
  })

  it('should login with password', async () => {
    // 1. Login
    const loginRes = await fetch('/auth/password/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    expect(loginRes.status).toBe(200)
    expect(await loginRes.json()).toEqual({ success: true })

    // 2. Get magic code
    const codeRes = await fetch(`/_test/last-code?email=${email}`)
    const codeData = await codeRes.json()
    magicCode = codeData.code
    expect(magicCode).toBeDefined()

    // 3. Verify login
    const verifyRes = await fetch(`/auth/password/login-verify?code=${magicCode}`, {
      redirect: 'manual', // Don't follow redirects
    })
    expect(verifyRes.status).toBe(302)
    const location = verifyRes.headers.get('location')
    expect(location).toContain('/auth/callback?code=')

    // Extract auth code from redirect URL
    const authCode = location!.split('code=')[1]

    // Exchange for token (standard Aegis flow)
    const tokenRes = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode }),
    })
    expect(tokenRes.status).toBe(200)
    const tokenData = await tokenRes.json()
    accessToken = tokenData.accessToken || tokenData.access_token
    expect(accessToken).toBeDefined()
  })

  it('should request password reset', async () => {
    const resetRes = await fetch('/auth/password/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    expect(resetRes.status).toBe(200)

    // Get magic code
    const codeRes = await fetch(`/_test/last-code?email=${email}`)
    const codeData = await codeRes.json()
    magicCode = codeData.code
    expect(magicCode).toBeDefined()
  })

  it('should verify reset code', async () => {
    const verifyRes = await fetch(`/auth/password/reset-verify?code=${magicCode}`, {
      redirect: 'manual', // Don't follow redirects
    })
    expect(verifyRes.status).toBe(302)
    const location = verifyRes.headers.get('location')
    expect(location).toContain('/reset-password?session=')
    sessionId = location!.split('session=')[1] || ''
    expect(sessionId).toBeDefined()
  })

  it('should complete password reset', async () => {
    const newPassword = 'NewPassword123!'
    const completeRes = await fetch('/auth/password/reset-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, password: newPassword }),
    })
    expect(completeRes.status).toBe(200)
    expect(await completeRes.json()).toEqual({ success: true })

    // Verify login with new password
    const loginRes = await fetch('/auth/password/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    })
    expect(loginRes.status).toBe(200)
  })

  it('should change password when authenticated', async () => {
    // Login first to get token (using new password from previous test)
    // We need a fresh token because previous one might be invalidated?
    // Actually, reset-complete invalidates sessions. So we need to login again.
    // We just did login request above, but didn't complete the flow to get token.

    // Let's do a full login flow to get token
    const newPassword = 'NewPassword123!'
    await fetch('/auth/password/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    })

    const codeRes = await fetch(`/_test/last-code?email=${email}`)
    const codeData = await codeRes.json()
    const code = codeData.code

    const verifyRes = await fetch(`/auth/password/login-verify?code=${code}`, {
      redirect: 'manual',
    })
    const location = verifyRes.headers.get('location')
    const authCode = location!.split('code=')[1]

    const tokenRes = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authCode }),
    })
    const tokenData = await tokenRes.json()
    const token = tokenData.accessToken

    // Change password
    const anotherPassword = 'AnotherPassword123!'
    const changeRes = await fetch('/auth/password/change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: newPassword,
        newPassword: anotherPassword,
      }),
    })
    expect(changeRes.status).toBe(200)
    expect(await changeRes.json()).toEqual({ success: true })

    // Verify login with another password
    const loginRes = await fetch('/auth/password/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: anotherPassword }),
    })
    expect(loginRes.status).toBe(200)
  })
})
