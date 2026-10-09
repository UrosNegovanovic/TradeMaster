import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup, expect } from '@playwright/test'
import { e2eEnv } from './support/env'

const AUTH_FILE = 'playwright/.auth/user.json'

/**
 * Signs the E2E user in once with a Clerk sign-in ticket (Development instance only: clerkSetup
 * refuses live keys). No password exists anywhere in the repo or CI.
 */
setup('sign in the E2E user', async ({ page }) => {
  const env = e2eEnv()
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: env.userEmail! })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Početna', level: 1 })).toBeVisible({ timeout: 30_000 })
  await page.context().storageState({ path: AUTH_FILE })
})
