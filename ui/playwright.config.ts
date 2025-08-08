import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests serially to avoid race conditions */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Force single worker to ensure serial execution */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['json', {  outputFile: 'test-results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    /* Collect trace for all tests */
    trace: 'on',
    /* Take screenshot for all tests */
    screenshot: 'on',
    /* Record video for all tests */
    video: 'on',
    /* Enable debug logs */
    launchOptions: {
      logger: {
        isEnabled: (name, severity) => {
          // Use params to satisfy lint and keep logging enabled
          return !!name || !!severity || true;
        },
        log: (name, severity, message, args) => console.log(`[${name}:${severity}] ${message}`, args)
      },
      headless: false // Run in headed mode to see the browser
    },
    contextOptions: {
      logger: {
        isEnabled: (name, severity) => {
          return !!name || !!severity || true;
        },
        log: (name, severity, message, args) => console.log(`[${name}:${severity}] ${message}`, args)
      }
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true, // Force headless mode to avoid dependency issues
      },
    },
    // Disable Firefox and Safari for now to focus on Chrome
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
    // API server should already be running on localhost:3000
  ],

  /* Global test timeout */
  timeout: 30 * 1000,
  /* Expect timeout for assertions */
  expect: {
    timeout: 10 * 1000,
  },
  
  /* Global setup and teardown */
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
});
