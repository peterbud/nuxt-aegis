/**
 * Shared test configuration for all E2E test fixtures
 * This disables Vite's HMR WebSocket server to prevent port conflicts
 * when multiple test servers run during E2E testing.
 */
export const testViteConfig = {
  vite: {
    server: {
      hmr: false,
      ws: false,
    },
  },
} as const
