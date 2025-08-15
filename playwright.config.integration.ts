import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for cross-app integration tests
 * 
 * This configuration is specifically for testing integration 
 * between multiple apps running simultaneously
 */

export default defineConfig({
  testDir: './tests/integration',
  timeout: 60000, // Longer timeout for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: './reports/e2e/integration' }],
    ['json', { outputFile: './reports/e2e/integration/results.json' }],
    ['line'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Longer timeout for cross-app navigation
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Run only on Chrome for integration tests to reduce complexity
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],

  // Global setup for integration tests
  globalSetup: require.resolve('./tests/integration/global-setup.ts'),
  globalTeardown: require.resolve('./tests/integration/global-teardown.ts'),

  // Multiple web servers for different apps
  webServer: [
    {
      command: 'npm run dev --workspace=@repo/landing-page',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev --workspace=@repo/auth-app',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev --workspace=@repo/dashboard-app',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev --workspace=@repo/admin-app',
      port: 3003,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});