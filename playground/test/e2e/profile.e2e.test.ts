import { test as base, expect } from '@playwright/test'

base.describe('Playground scenarios', () => {
  base('server-renders only the SSR demo', async ({ request }) => {
    for (const path of ['/', '/sign-in', '/access', '/claims', '/impersonation', '/account', '/reset-password', '/redirects']) {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      expect(await response.text()).not.toContain('class="playground-shell"')
    }

    const response = await request.get('/ssr')
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('data-testid="server-snapshot"')
  })

  for (const signedIn of [false, true]) {
    base(`preserves the server snapshot after hydration for ${signedIn ? 'a signed-in user' : 'a guest'}`, async ({ page }) => {
      await page.goto(signedIn ? '/auth/mock?user=user&redirectTo=/access' : '/access')
      await expect(page.locator('.header-session')).toContainText(signedIn ? 'Signed in' : 'Signed out')
      const documentResponse = page.waitForResponse(response =>
        response.request().resourceType() === 'document' && new URL(response.url()).pathname === '/ssr',
      )
      await page.locator('.scenario-link[href="/ssr"]').click()
      const response = await documentResponse
      expect(response.status()).toBe(200)
      const html = await response.text()
      const original = await page.evaluate((source) => {
        const document = new DOMParser().parseFromString(source, 'text/html')
        return {
          snapshot: document.querySelector('[data-testid="server-snapshot"]')?.textContent,
          client: document.querySelector('[data-testid="client-state"]')?.textContent,
        }
      }, html)
      expect(original.snapshot).toContain('Server-rendered')
      expect(original.client).toContain('Client mountedNo')
      if (signedIn) {
        expect(original.snapshot).toContain('Authenticated')
        expect(original.snapshot).toContain('user@example.com')
        expect(original.snapshot).toContain('Profile fetchedYes')
      }
      else {
        expect(original.snapshot).not.toContain('Authenticated')
        expect(original.snapshot).not.toContain('user@example.com')
        expect(original.snapshot).toContain('Profile fetchedNo')
      }
      await expect(page.getByTestId('client-state')).toContainText('Client mountedYes')
      await expect(page.getByTestId('client-state')).toContainText(signedIn ? 'Authenticated' : 'Guest')
      await expect(page.getByTestId('server-snapshot')).toHaveText(original.snapshot!)
      await expect(page.locator('.scenario-link[href="/ssr"]')).toHaveAttribute('aria-current', 'page')
      await expect(page.getByRole('button', { name: 'Start login', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Sign out to demo', exact: true })).toHaveCount(0)
      await expect(page.locator('.scenario-link--active')).toHaveCount(1)
      await page.getByRole('button', { name: 'Reload page', exact: true }).click()
      await expect(page.getByTestId('client-state')).toContainText('Client mountedYes')
      await expect(page.getByTestId('server-snapshot')).toContainText('Server-rendered')
      await expect(page.getByTestId('server-snapshot')).not.toHaveText(original.snapshot!)
    })
  }

  base('checks guest access and preserves the shared shell', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.playground-shell')).toHaveCount(1)
    await expect(page.locator('.scenario-content').getByRole('heading', { name: 'Sign-in', exact: true })).toBeVisible()
    await expect(page.locator('.header-session')).toContainText('Signed out')
    await expect(page.locator('.session-sidebar')).toContainText('No active session')
    await page.locator('.playground-shell').evaluate(shell => shell.setAttribute('data-navigation-check', 'preserved'))
    await page.locator('.scenario-link[href="/access"]').click()
    await expect(page.locator('.playground-shell')).toHaveAttribute('data-navigation-check', 'preserved')
    const requests = page.locator('.test-list').first().getByRole('button', { name: 'Run request' })
    await expect(requests.nth(2)).toBeDisabled()
    await requests.nth(0).click()
    await expect(page.locator('.result-heading')).toContainText('200')
    await requests.nth(1).click()
    await expect(page.locator('.result-heading')).toContainText('401 · Expected denial')
    await page.locator('.scenario-link[href="/claims"]').click()
    await expect(page.getByRole('button', { name: 'Update role', exact: true })).toBeDisabled()
    await expect(page.locator('.session-sidebar')).toContainText('No active session')
    await expect(page.locator('.scenario-content section')).toHaveCount(1)
  })

  base('signs in, updates claims, fetches profiles and signs out', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.locator('.playground-shell')).toHaveCount(1)
    await expect(page.locator('.scenario-content').getByRole('heading', { name: 'Sign-in', exact: true })).toBeVisible()
    await page.locator('.identity-list li').first().getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.locator('.session-sidebar')).toContainText('user@example.com')
    await page.locator('.scenario-link[href="/claims"]').click()
    const role = page.getByRole('combobox', { name: 'Role' })
    const updateRole = page.getByRole('button', { name: 'Update role', exact: true })
    await role.selectOption('moderator')
    await updateRole.click()
    await expect(page.locator('.result-panel')).toContainText('→ moderator')
    await expect(page.locator('.session-details')).toContainText('moderator')
    await page.getByRole('checkbox', { name: 'write', exact: true }).check()
    await page.getByRole('button', { name: 'Update permissions', exact: true }).click()
    await expect(page.locator('.session-details')).toContainText('write')
    await role.selectOption('user')
    await updateRole.click()
    await page.getByRole('checkbox', { name: 'write', exact: true }).uncheck()
    await page.getByRole('button', { name: 'Update permissions', exact: true }).click()
    await expect(page.locator('.session-details .permission-tag')).toHaveText(['read'])
    await page.locator('.scenario-link[href="/access"]').click()
    await page.locator('.test-list').first().getByRole('button', { name: 'Run request' }).nth(2).click()
    await expect(page.locator('.result-panel pre')).toContainText('user@example.com')
    await page.locator('.scenario-link[href="/ssr"]').click()
    await expect(page).toHaveURL(/\/ssr$/)
    await expect(page.getByRole('heading', { name: 'SSR', exact: true })).toBeVisible()
    await expect(page.locator('.result-panel pre')).toContainText('user@example.com')
    await page.reload()
    await expect(page.locator('.result-panel pre')).toContainText('user@example.com')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.locator('.session-sidebar')).toContainText('No active session')
  })

  base('tests server context while impersonating and restores the admin', async ({ page }) => {
    await page.goto('/auth/mock?user=user&redirectTo=/sign-in')
    await expect(page.locator('.header-session')).toContainText('Signed in')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await page.locator('.identity-list li').nth(1).getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('.session-sidebar')).toContainText('admin@example.com')
    await page.locator('.scenario-link[href="/impersonation"]').click()
    await page.getByLabel('Target user').fill('user@example.com')
    await page.getByLabel('Reason (optional)').fill('V2 browser regression test')
    await page.getByRole('button', { name: 'Start impersonation' }).click()
    await expect(page.locator('.impersonation-notice')).toContainText('user@example.com')
    await page.getByRole('button', { name: 'Run request', exact: true }).click()
    await expect(page.locator('.result-panel').last()).toContainText('"isImpersonating": true')
    await expect(page.locator('.result-panel').last()).toContainText('admin@example.com')
    await page.getByRole('button', { name: 'Stop impersonation', exact: true }).click()
    await expect(page.locator('.impersonation-notice')).toHaveCount(0)
    await expect(page.locator('.session-sidebar')).toContainText('admin@example.com')
  })

  base('registers with confirmation and carries verification back to the playground', async ({ page }) => {
    let registrationBody: unknown
    await page.route('**/auth/password/register', async (route) => {
      registrationBody = route.request().postDataJSON()
      await route.fulfill({ json: { success: true } })
    })
    await page.route('**/auth/password/register-verify?*', route => route.fulfill({ status: 302, headers: { location: '/auth/callback?code=v2-test-code' } }))
    await page.route('**/auth/callback?code=v2-test-code*', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Verification destination</body></html>' }))
    await page.goto('/sign-in')
    await page.getByRole('radio', { name: 'Register', exact: true }).check()
    await page.getByLabel('Email', { exact: true }).fill('v2-test@example.com')
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm password', { exact: true }).fill('DifferentPassword123!')
    await page.getByRole('button', { name: 'Register', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Passwords do not match')
    expect(registrationBody).toBeUndefined()
    await page.getByLabel('Confirm password', { exact: true }).fill('TestPassword123!')
    await page.getByRole('button', { name: 'Register', exact: true }).click()
    await expect(page.getByLabel('Verification code')).toBeVisible()
    expect(registrationBody).toEqual({ email: 'v2-test@example.com', password: 'TestPassword123!' })
    await page.getByLabel('Verification code').fill('123456')
    await page.getByRole('button', { name: 'Verify code', exact: true }).click()
    await expect(page).toHaveURL(/\/auth\/callback\?code=v2-test-code&redirectTo=%2Fsign-in$/)
  })

  base('completes password recovery from the server reset destination', async ({ page }) => {
    let resetBody: unknown
    await page.route('**/auth/password/reset-request', route => route.fulfill({ json: { success: true } }))
    await page.route('**/auth/password/reset-verify?*', route => route.fulfill({ status: 302, headers: { location: '/reset-password?session=v2-reset-session' } }))
    await page.route('**/auth/password/reset-complete', async (route) => {
      resetBody = route.request().postDataJSON()
      await route.fulfill({ json: { success: true } })
    })
    await page.goto('/account')
    await page.getByLabel('Email', { exact: true }).fill('v2-test@example.com')
    await page.getByRole('button', { name: 'Send reset code', exact: true }).click()
    await page.getByLabel('Verification code').fill('123456')
    await page.getByRole('button', { name: 'Verify code', exact: true }).click()
    await expect(page).toHaveURL(/\/reset-password\?session=v2-reset-session$/)
    await page.getByLabel('New password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm new password', { exact: true }).fill('TestPassword123!')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page).toHaveURL(/\/account\?reset=success$/)
    await expect(page.getByRole('status')).toContainText('Password reset successful')
    expect(resetBody).toEqual({ sessionId: 'v2-reset-session', password: 'TestPassword123!' })
  })

  base('sends the bearer token when changing a password', async ({ page }) => {
    const payload = {
      sub: 'v2-password-user',
      email: 'v2-password@example.com',
      name: 'Password User',
      provider: 'password',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    const accessToken = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test-signature`
    let changeBody: unknown
    let authorization: string | undefined
    await page.route('**/auth/refresh', route => route.fulfill({ json: { accessToken } }))
    await page.route('**/auth/password/change', async (route) => {
      changeBody = route.request().postDataJSON()
      authorization = route.request().headers().authorization
      await route.fulfill({ json: { success: true } })
    })
    await page.goto('/account')
    await page.getByLabel('Current password', { exact: true }).fill('OldPassword123!')
    await page.getByLabel('New password', { exact: true }).fill('NewPassword123!')
    await page.getByLabel('Confirm new password', { exact: true }).fill('NewPassword123!')
    await page.getByRole('button', { name: 'Update password', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Password changed successfully')
    expect(changeBody).toEqual({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' })
    expect(authorization).toBe(`Bearer ${accessToken}`)
  })

  base('returns to the playground from the custom login redirect and uses the logout destination', async ({ page }) => {
    await page.goto('/access')
    await expect(page.getByRole('button', { name: 'Run request', exact: true }).first()).toBeEnabled()
    await page.locator('.playground-shell').evaluate(shell => shell.setAttribute('data-navigation-check', 'preserved'))
    await page.locator('.scenario-link[href="/redirects"]').click()
    await expect(page).toHaveURL(/\/redirects$/)
    await expect(page.getByRole('heading', { name: 'Redirects', exact: true })).toBeVisible()
    await expect(page.locator('.playground-shell')).toHaveAttribute('data-navigation-check', 'preserved')
    await expect(page.getByTestId('server-snapshot')).toHaveCount(0)
    await expect(page.getByTestId('client-state')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Fetch profile', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sign out to demo', exact: true })).toBeDisabled()
    await page.getByRole('link', { name: 'Open page', exact: true }).click()
    await expect(page).toHaveURL(/\/auth-failed\?error=access_denied$/)
    await expect(page.getByRole('heading', { name: 'Access Denied', exact: true })).toBeVisible()
    await page.locator('.scenario-link[href="/redirects"]').click()
    await page.getByRole('button', { name: 'Start login', exact: true }).click()
    await expect(page).toHaveURL(/\/login-redirect-demo\?from=playground$/)
    await expect(page.getByRole('heading', { name: 'Custom Login Redirect Reached' })).toBeVisible()
    await page.getByRole('link', { name: 'Return to Playground', exact: true }).click()
    await expect(page).toHaveURL(/\/redirects$/)
    await expect(page.getByRole('button', { name: 'Start login', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Sign out to demo', exact: true }).click()
    await expect(page).toHaveURL(/\/logout-success$/)
  })
})

// Extend base test for regular user with auto-authentication
const userTest = base.extend<{ authenticatedPage: undefined }>({
  authenticatedPage: [async ({ page }, use) => {
    // Navigate to mock auth endpoint for regular user
    await page.goto('/auth/mock?user=user', { waitUntil: 'load' })
    await page.waitForURL(/\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await page.locator('.scenario-link[href="/claims"]').click()
    await use(undefined)
  }, { auto: true }],
})

// Extend base test for admin user with auto-authentication
const adminTest = base.extend<{ authenticatedPage: undefined }>({
  authenticatedPage: [async ({ page }, use) => {
    // Navigate to mock auth endpoint for admin user
    await page.goto('/auth/mock?user=admin', { waitUntil: 'load' })
    await page.waitForURL(/\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await page.locator('.scenario-link[href="/claims"]').click()
    await use(undefined)
  }, { auto: true }],
})

userTest.describe('Authentication State - Regular User', () => {
  userTest('should verify user is authenticated via UI', async ({ page }) => {
    // Verify authentication succeeded by checking the status badge
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Verify the email is shown
    await expect(statusBadge).toContainText('user@example.com')

    // Verify the role is shown
    await expect(statusBadge).toContainText('user')
  })

  userTest('should call protected API endpoint via button', async ({ page }) => {
    await page.goto('/protected-page')
    // Click the "Call Protected API Endpoint" button
    const button = page.getByRole('button', { name: 'Refresh Data' })
    await button.click()

    // Wait for the API response to be displayed
    const responseBox = page.locator('.response-box').first()
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    // Get the response text and verify it contains the correct user data
    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('user@example.com')
    expect(responseText).toContain('Regular User')
    expect(responseText).toContain('"role": "user"')
  })

  userTest('should restore auth on cold start before protected middleware decides', async ({ page, browser }) => {
    const cookies = await page.context().cookies()
    const refreshCookie = cookies.find(cookie => cookie.name === 'nuxt-aegis-refresh')

    expect(refreshCookie).toBeDefined()

    const freshContext = await browser.newContext()

    try {
      await freshContext.addCookies(cookies)

      const coldStartPage = await freshContext.newPage()
      await coldStartPage.goto('/protected-page', { waitUntil: 'load' })
      await coldStartPage.waitForLoadState('networkidle')

      await expect(coldStartPage).toHaveURL(/\/protected-page$/)
      await expect(coldStartPage.getByRole('heading', { name: 'Protected Page' })).toBeVisible({ timeout: 10000 })
      await expect(coldStartPage.locator('.user-info')).toContainText('Regular User')
      await expect(coldStartPage.locator('.response-box')).toContainText('user@example.com')
    }
    finally {
      await freshContext.close()
    }
  })
})

adminTest.describe('Authentication State - Admin User', () => {
  adminTest('should verify admin is authenticated via UI', async ({ page }) => {
    // Verify authentication succeeded by checking the status badge
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Verify the email is shown
    await expect(statusBadge).toContainText('admin@example.com')

    // Verify the role is shown
    await expect(statusBadge).toContainText('admin')
  })

  adminTest('should call protected API endpoint via button', async ({ page }) => {
    await page.goto('/protected-page')
    // Click the "Call Protected API Endpoint" button
    const button = page.getByRole('button', { name: 'Refresh Data' })
    await button.click()

    // Wait for the API response to be displayed
    const responseBox = page.locator('.response-box').first()
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    // Get the response text and verify it contains the correct admin data
    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('admin@example.com')
    expect(responseText).toContain('Admin User')
    expect(responseText).toContain('"role": "admin"')
  })
})

// Claims Update Tests — uses refresh({ updateClaims: true }) via the playground UI
userTest.describe('Claims Update - Role Change', () => {
  userTest('should update role from user to moderator and reflect in JWT', async ({ page }) => {
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Verify initial role is "user"
    await expect(statusBadge).toContainText('user')

    // Find the claims update section
    const claimsSection = page.locator('.scenario-content')
    await expect(claimsSection).toBeVisible()

    // Change the role dropdown to "moderator"
    const roleSelect = claimsSection.locator('select')
    await roleSelect.selectOption('moderator')

    // Click "Update Role" button
    const updateRoleButton = claimsSection.getByRole('button', { name: 'Update role' })
    await updateRoleButton.click()

    // Wait for the success response
    const successBox = claimsSection.locator('.feedback[role=status]')
    await expect(successBox).toBeVisible({ timeout: 10000 })
    await expect(successBox).toContainText('Claims updated without signing in again.')

    // Verify the status badge now shows the new role
    await expect(statusBadge).toContainText('moderator')

    // Verify current claims section reflects the change
    const currentClaims = page.locator('.session-sidebar')
    await expect(currentClaims).toContainText('moderator')
  })

  userTest('should update role from user to admin and reflect in API response', async ({ page }) => {
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Change role to admin
    const claimsSection = page.locator('.scenario-content')
    const roleSelect = claimsSection.locator('select')
    await roleSelect.selectOption('admin')

    // Click "Update Role"
    const updateRoleButton = claimsSection.getByRole('button', { name: 'Update role' })
    await updateRoleButton.click()

    // Wait for success
    const successBox = claimsSection.locator('.feedback[role=status]')
    await expect(successBox).toBeVisible({ timeout: 10000 })

    // Verify status badge updated
    await expect(statusBadge).toContainText('admin')

    // Now call the protected API to verify the JWT contains the new role
    await page.goto('/protected-page')
    const apiButton = page.getByRole('button', { name: 'Refresh Data' })
    await apiButton.click()

    // Scope to the Authenticated Actions card to avoid matching the claims success box
    const actionsCard = page.locator('.scenario-content').first()
    const responseBox = actionsCard.locator('.response-box')
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('"role": "admin"')
  })
})

userTest.describe('Claims Update - Permissions Change', () => {
  userTest('should add write permission and reflect in JWT', async ({ page }) => {
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    const claimsSection = page.locator('.scenario-content')
    await expect(claimsSection).toBeVisible()

    // Verify initial permissions show "read" only
    const currentClaims = page.locator('.session-sidebar')
    await expect(currentClaims).toContainText('read')

    // Check the "Write" permission checkbox
    const writeCheckbox = claimsSection.locator('.permission-fields label').filter({ hasText: 'write' }).locator('input[type="checkbox"]')
    await writeCheckbox.check()

    // Click "Update Permissions"
    const updatePermsButton = claimsSection.getByRole('button', { name: 'Update permissions' })
    await updatePermsButton.click()

    // Wait for success
    const successBox = claimsSection.locator('.feedback[role=status]')
    await expect(successBox).toBeVisible({ timeout: 10000 })
    await expect(successBox).toContainText('Claims updated without signing in again.')

    // Verify current claims reflect both permissions
    await expect(currentClaims).toContainText('read')
    await expect(currentClaims).toContainText('write')
  })

  userTest('should update permissions and verify via protected API', async ({ page }) => {
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    const claimsSection = page.locator('.scenario-content')

    // Add "delete" permission
    const deleteCheckbox = claimsSection.locator('.permission-fields label').filter({ hasText: 'delete' }).locator('input[type="checkbox"]')
    await deleteCheckbox.check()

    // Click "Update Permissions"
    const updatePermsButton = claimsSection.getByRole('button', { name: 'Update permissions' })
    await updatePermsButton.click()

    // Wait for success
    const successBox = claimsSection.locator('.feedback[role=status]')
    await expect(successBox).toBeVisible({ timeout: 10000 })

    // Call protected API and verify permissions in JWT
    await page.goto('/protected-page')
    const apiButton = page.getByRole('button', { name: 'Refresh Data' })
    await apiButton.click()

    // Scope to the Authenticated Actions card to avoid matching the claims success box
    const actionsCard = page.locator('.scenario-content').first()
    const responseBox = actionsCard.locator('.response-box')
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('"delete"')
  })
})

userTest.describe('Claims Update - Combined Role and Permissions', () => {
  userTest('should update role and permissions sequentially', async ({ page }) => {
    const statusBadge = page.locator('.session-sidebar')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    const claimsSection = page.locator('.scenario-content')

    // Step 1: Update role to moderator
    const roleSelect = claimsSection.locator('select')
    await roleSelect.selectOption('moderator')

    const updateRoleButton = claimsSection.getByRole('button', { name: 'Update role' })
    await updateRoleButton.click()

    let successBox = claimsSection.locator('.feedback[role=status]')
    await expect(successBox).toBeVisible({ timeout: 10000 })
    await expect(statusBadge).toContainText('moderator')

    // Step 2: Add write and delete permissions
    const writeCheckbox = claimsSection.locator('.permission-fields label').filter({ hasText: 'write' }).locator('input[type="checkbox"]')
    await writeCheckbox.check()
    const deleteCheckbox = claimsSection.locator('.permission-fields label').filter({ hasText: 'delete' }).locator('input[type="checkbox"]')
    await deleteCheckbox.check()

    const updatePermsButton = claimsSection.getByRole('button', { name: 'Update permissions' })
    await updatePermsButton.click()

    successBox = claimsSection.locator('.feedback[role=status]')
    await expect(successBox).toBeVisible({ timeout: 10000 })

    // Verify both changes reflected in the API
    await page.goto('/protected-page')
    const apiButton = page.getByRole('button', { name: 'Refresh Data' })
    await apiButton.click()

    // Scope to the Authenticated Actions card to avoid matching the claims success box
    const actionsCard = page.locator('.scenario-content').first()
    const responseBox = actionsCard.locator('.response-box')
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('"role": "moderator"')
    expect(responseText).toContain('"write"')
    expect(responseText).toContain('"delete"')
  })
})

base.describe('Index playground shell', () => {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    base(`renders legacy pages without overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      for (const [path, heading] of [
        ['/auth-failed?error=access_denied&error_description=Permission%20denied', 'Access Denied'],
        ['/logout-success', 'Logged Out Successfully'],
        ['/public-page', 'Public Page'],
        ['/login-redirect-demo', 'Custom Login Redirect Reached'],
        ['/ssr', 'SSR'],
        ['/redirects', 'Redirects'],
      ]) {
        await page.goto(path!)
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
        await expect(page.locator('.playground-shell')).toHaveCount(1)
        await expect(page.locator('.page-header')).toHaveCount(1)
        await expect(page.locator('.session-sidebar')).toHaveCount(1)
        await expect(page.locator('.scenario-link')).toHaveCount(7)
        await expect(page.locator('.header-session')).toContainText('Signed out')
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        if (path!.startsWith('/auth-failed')) {
          await page.getByText('Technical Details', { exact: true }).click()
          await expect(page.locator('.comparison')).toContainText('Permission denied')
        }
        if (path === '/public-page') {
          await expect(page.locator('.result-panel')).toBeVisible()
          await page.getByRole('button', { name: 'Refresh Data' }).click()
          await expect(page.locator('.result-panel')).toBeVisible()
        }
        await page.screenshot({ path: `test-results/playground-${viewport.width}-${path!.split('?')[0]!.slice(1)}.png`, fullPage: true })
      }
    })
  }

  base('redirects guests away from the protected page', async ({ page }) => {
    await page.goto('/access')
    await expect(page.locator('.header-session')).toContainText('Signed out')
    await page.getByRole('link', { name: 'Open page', exact: true }).nth(1).click()
    await expect(page).toHaveURL(/\/sign-in(?:\?|$)/)
    await expect(page.getByRole('heading', { name: 'Sign-in', exact: true })).toBeVisible()
  })
})
