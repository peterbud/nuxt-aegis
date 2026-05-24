import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Environment
    environment: 'node',

    // Don't highlight slow tests unless they take more than 5 seconds
    slowTestThreshold: 5000,

    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      '.nuxt/**',
      '.output/**',
    ],

    // Project-based configuration for different test types
    projects: [
      // Unit tests - run in parallel for speed
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          pool: 'forks',
          sequence: {
            groupOrder: 0,
          },
          testTimeout: 10000,
          hookTimeout: 10000,
        },
      },
      // E2E tests - run sequentially to avoid resource conflicts
      {
        test: {
          name: 'e2e',
          include: [
            'test/basic.test.ts',
            'test/google-mock.test.ts',
            'test/google-mock-errors.test.ts',
            'test/google-mock-impersonation.test.ts',
            'test/google-mock-protected.test.ts',
            'test/password-auth.test.ts',
            'test/redirect-config.test.ts',
            'test/ssr-enabled.test.ts',
            'test/rotation-disabled.test.ts',
            'test/minimal-e2e.test.ts',
          ],
          pool: 'forks',
          maxWorkers: 1,
          isolate: false,
          sequence: {
            groupOrder: 1,
          },
          testTimeout: 60000,
          hookTimeout: 60000,
        },
      },
    ],
  },
})
