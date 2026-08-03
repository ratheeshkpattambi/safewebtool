// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000, // Increased timeout for ML tools
  expect: {
    timeout: 10000 // Increased expect timeout
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      // Real WebKit engine, not just a Chromium viewport preset. iOS requires every
      // browser (including mobile Chrome) to embed WebKit, so this — not
      // chromium-mobile — is what actually exercises iOS-specific WASM/worker
      // behavior. chromium-mobile only emulates viewport/UA/touch on desktop
      // Chromium/V8 and cannot reproduce a WebKit-only crash.
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
}); 