import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './e2e/support/env'

/**
 * TradeMaster E2E (see e2e/README.md).
 *
 * - public-*: no sign-in, read-only; safe against localhost, a Vercel preview or production.
 * - app-*: signed in as the E2E test user (Clerk Development, ticket sign-in, no password);
 *   only defined when E2E_USER_EMAIL and a Clerk test secret are present.
 * Tests that write data are tagged @writes and are skipped unless the target is allowed (support/env.ts).
 */
if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e')

const env = e2eEnv()
const AUTH_FILE = 'playwright/.auth/user.json'
const CI = Boolean(process.env.CI)

const browserDefaults = {
  locale: 'sr-RS',
  // Day boundaries in the app are Europe/Belgrade (src/lib/local-date.ts).
  timezoneId: 'Europe/Belgrade',
}

const appProjects = env.signedInEnabled
  ? [
      { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...browserDefaults } },
      {
        name: 'app-desktop',
        testDir: './e2e/app',
        dependencies: ['setup'],
        use: { ...devices['Desktop Chrome'], ...browserDefaults, storageState: AUTH_FILE },
      },
      {
        name: 'app-mobile',
        testDir: './e2e/app',
        dependencies: ['setup'],
        use: { ...devices['Pixel 7'], ...browserDefaults, storageState: AUTH_FILE },
      },
    ]
  : []

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Protected Vercel previews: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection
    extraHTTPHeaders: env.vercelBypassSecret
      ? { 'x-vercel-protection-bypass': env.vercelBypassSecret, 'x-vercel-set-bypass-cookie': 'true' }
      : undefined,
  },
  projects: [
    {
      name: 'public-desktop',
      testDir: './e2e/public',
      use: { ...devices['Desktop Chrome'], ...browserDefaults },
    },
    {
      name: 'public-mobile',
      testDir: './e2e/public',
      use: { ...devices['Pixel 7'], ...browserDefaults },
    },
    ...(env.webkit
      ? [{ name: 'public-iphone', testDir: './e2e/public', use: { ...devices['iPhone 14'], ...browserDefaults } }]
      : []),
    ...appProjects,
  ],
  // Local runs start the app; a remote E2E_BASE_URL is tested as deployed.
  // E2E_SERVER=start tests a production build (no first-compile delays); default is the dev server.
  webServer: env.isLocal
    ? {
        command: process.env.E2E_SERVER === 'start' ? 'npm run build && npm run start' : 'npm run dev',
        url: env.baseURL,
        reuseExistingServer: !CI,
        timeout: 300_000,
      }
    : undefined,
})
