import type { ConfigOptions } from '@nuxt/test-utils/playwright'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  testMatch: '**/*.e2e.test.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120 * 1000,

  reporter: [
    ['html', {
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: '../test-results/report.html',
    }],
  ],

  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command: 'pnpm dev --envName test',
    url: 'http://localhost:3000',
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI,
  },
})
