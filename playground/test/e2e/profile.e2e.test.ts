import { test as base, expect } from '@playwright/test'

// Extend base test for regular user with auto-authentication
const userTest = base.extend<{ authenticatedPage: undefined }>({
  authenticatedPage: [async ({ page }, use) => {
    // Navigate to mock auth endpoint for regular user
    await page.goto('/auth/mock?user=user', { waitUntil: 'load' })
    await page.waitForURL(/\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

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

    await use(undefined)
  }, { auto: true }],
})

userTest.describe('Authentication State - Regular User', () => {
  userTest('should verify user is authenticated via UI', async ({ page }) => {
    // Verify authentication succeeded by checking the status badge
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Verify the email is shown
    await expect(statusBadge).toContainText('user@example.com')

    // Verify the role is shown
    await expect(statusBadge).toContainText('(user)')
  })

  userTest('should call protected API endpoint via button', async ({ page }) => {
    // Click the "Call Protected API Endpoint" button
    const button = page.getByRole('button', { name: 'Call Protected API Endpoint' })
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
})

adminTest.describe('Authentication State - Admin User', () => {
  adminTest('should verify admin is authenticated via UI', async ({ page }) => {
    // Verify authentication succeeded by checking the status badge
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Verify the email is shown
    await expect(statusBadge).toContainText('admin@example.com')

    // Verify the role is shown
    await expect(statusBadge).toContainText('(admin)')
  })

  adminTest('should call protected API endpoint via button', async ({ page }) => {
    // Click the "Call Protected API Endpoint" button
    const button = page.getByRole('button', { name: 'Call Protected API Endpoint' })
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
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Verify initial role is "user"
    await expect(statusBadge).toContainText('(user)')

    // Find the claims update section
    const claimsSection = page.locator('.section-claims')
    await expect(claimsSection).toBeVisible()

    // Change the role dropdown to "moderator"
    const roleSelect = claimsSection.locator('select.input')
    await roleSelect.selectOption('moderator')

    // Click "Update Role" button
    const updateRoleButton = claimsSection.getByRole('button', { name: 'Update Role' })
    await updateRoleButton.click()

    // Wait for the success response
    const successBox = claimsSection.locator('.response-box.success')
    await expect(successBox).toBeVisible({ timeout: 10000 })
    await expect(successBox).toContainText('JWT updated successfully')

    // Verify the status badge now shows the new role
    await expect(statusBadge).toContainText('(moderator)')

    // Verify current claims section reflects the change
    const currentClaims = claimsSection.locator('.current-claims')
    await expect(currentClaims).toContainText('moderator')
  })

  userTest('should update role from user to admin and reflect in API response', async ({ page }) => {
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    // Change role to admin
    const claimsSection = page.locator('.section-claims')
    const roleSelect = claimsSection.locator('select.input')
    await roleSelect.selectOption('admin')

    // Click "Update Role"
    const updateRoleButton = claimsSection.getByRole('button', { name: 'Update Role' })
    await updateRoleButton.click()

    // Wait for success
    const successBox = claimsSection.locator('.response-box.success')
    await expect(successBox).toBeVisible({ timeout: 10000 })

    // Verify status badge updated
    await expect(statusBadge).toContainText('(admin)')

    // Now call the protected API to verify the JWT contains the new role
    const apiButton = page.getByRole('button', { name: 'Call Protected API Endpoint' })
    await apiButton.click()

    // Scope to the Authenticated Actions card to avoid matching the claims success box
    const actionsCard = page.locator('.column-actions > .card').first()
    const responseBox = actionsCard.locator('.response-box')
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('"role": "admin"')
  })
})

userTest.describe('Claims Update - Permissions Change', () => {
  userTest('should add write permission and reflect in JWT', async ({ page }) => {
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    const claimsSection = page.locator('.section-claims')
    await expect(claimsSection).toBeVisible()

    // Verify initial permissions show "read" only
    const currentClaims = claimsSection.locator('.current-claims')
    await expect(currentClaims).toContainText('read')

    // Check the "Write" permission checkbox
    const writeCheckbox = claimsSection.locator('.checkbox-label').filter({ hasText: 'Write' }).locator('input[type="checkbox"]')
    await writeCheckbox.check()

    // Click "Update Permissions"
    const updatePermsButton = claimsSection.getByRole('button', { name: 'Update Permissions' })
    await updatePermsButton.click()

    // Wait for success
    const successBox = claimsSection.locator('.response-box.success')
    await expect(successBox).toBeVisible({ timeout: 10000 })
    await expect(successBox).toContainText('JWT updated successfully')

    // Verify current claims reflect both permissions
    await expect(currentClaims).toContainText('read')
    await expect(currentClaims).toContainText('write')
  })

  userTest('should update permissions and verify via protected API', async ({ page }) => {
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    const claimsSection = page.locator('.section-claims')

    // Add "delete" permission
    const deleteCheckbox = claimsSection.locator('.checkbox-label').filter({ hasText: 'Delete' }).locator('input[type="checkbox"]')
    await deleteCheckbox.check()

    // Click "Update Permissions"
    const updatePermsButton = claimsSection.getByRole('button', { name: 'Update Permissions' })
    await updatePermsButton.click()

    // Wait for success
    const successBox = claimsSection.locator('.response-box.success')
    await expect(successBox).toBeVisible({ timeout: 10000 })

    // Call protected API and verify permissions in JWT
    const apiButton = page.getByRole('button', { name: 'Call Protected API Endpoint' })
    await apiButton.click()

    // Scope to the Authenticated Actions card to avoid matching the claims success box
    const actionsCard = page.locator('.column-actions > .card').first()
    const responseBox = actionsCard.locator('.response-box')
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('"delete"')
  })
})

userTest.describe('Claims Update - Combined Role and Permissions', () => {
  userTest('should update role and permissions sequentially', async ({ page }) => {
    const statusBadge = page.locator('.status-badge.status-logged-in')
    await expect(statusBadge).toBeVisible({ timeout: 10000 })

    const claimsSection = page.locator('.section-claims')

    // Step 1: Update role to moderator
    const roleSelect = claimsSection.locator('select.input')
    await roleSelect.selectOption('moderator')

    const updateRoleButton = claimsSection.getByRole('button', { name: 'Update Role' })
    await updateRoleButton.click()

    let successBox = claimsSection.locator('.response-box.success')
    await expect(successBox).toBeVisible({ timeout: 10000 })
    await expect(statusBadge).toContainText('(moderator)')

    // Step 2: Add write and delete permissions
    const writeCheckbox = claimsSection.locator('.checkbox-label').filter({ hasText: 'Write' }).locator('input[type="checkbox"]')
    await writeCheckbox.check()
    const deleteCheckbox = claimsSection.locator('.checkbox-label').filter({ hasText: 'Delete' }).locator('input[type="checkbox"]')
    await deleteCheckbox.check()

    const updatePermsButton = claimsSection.getByRole('button', { name: 'Update Permissions' })
    await updatePermsButton.click()

    successBox = claimsSection.locator('.response-box.success')
    await expect(successBox).toBeVisible({ timeout: 10000 })

    // Verify both changes reflected in the API
    const apiButton = page.getByRole('button', { name: 'Call Protected API Endpoint' })
    await apiButton.click()

    // Scope to the Authenticated Actions card to avoid matching the claims success box
    const actionsCard = page.locator('.column-actions > .card').first()
    const responseBox = actionsCard.locator('.response-box')
    await expect(responseBox).toBeVisible({ timeout: 5000 })

    const responseText = await responseBox.locator('pre').textContent()
    expect(responseText).toContain('"role": "moderator"')
    expect(responseText).toContain('"write"')
    expect(responseText).toContain('"delete"')
  })
})
