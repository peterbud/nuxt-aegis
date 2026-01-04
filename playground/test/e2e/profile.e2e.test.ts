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
