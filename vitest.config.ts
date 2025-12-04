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
          poolOptions: {
            forks: {
              singleFork: false, // Allow parallel execution
            },
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
            'test/google-mock-protected.test.ts',
            'test/password-auth.test.ts',
            'test/redirect-config.test.ts',
          ],
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true, // Force sequential execution
            },
          },
          testTimeout: 60000,
          hookTimeout: 60000,
        },
      },
    ],
  },
})
