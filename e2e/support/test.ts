import { test as base, expect } from '@playwright/test'

/**
 * Shared test: fails a test when the page throws an uncaught error, so a broken screen
 * is caught even when its heading still renders.
 */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = []
      page.on('pageerror', (error) => errors.push(error))
      await use(errors)
      expect(errors.map((error) => error.message), 'uncaught errors in the page').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** True when the page scrolls sideways, the most common phone-layout regression. */
export async function hasHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}
