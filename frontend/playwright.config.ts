import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Suite Configuration
 * Optimized for Vite, Supabase Sandbox Reset Loops, and Auto-Debugging.
 */
export default defineConfig({
  // Points out of the frontend directory and into your root tests folder [cite: 1]
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only to prevent flaky runs */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* HTML reporter for beautiful test failure summaries */
  reporter: 'html',
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like await page.goto('/') [cite: 2] */
    baseURL: 'http://localhost:5173',
  },

  /* Configure projects for major browser engine verification [cite: 2] */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Automatically boot your local Vite dev server before starting E2E tests [cite: 3] */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    cwd: './frontend', // Directs execution to run inside the frontend directory [cite: 3]
    timeout: 120000,   // 2 minutes startup grace window [cite: 3]
  },
});