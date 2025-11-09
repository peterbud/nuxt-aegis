import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // Unit tests - run in parallel for speed
  {
    test: {
      name: 'unit',
      include: ['test/unit/**/*.test.ts'],
      environment: 'node',
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
      ],
      environment: 'node',
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
])
