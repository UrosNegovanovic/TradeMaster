import { test, expect, hasHorizontalOverflow } from '../support/test'

/** Read-only: every main screen opens for a signed-in company, on desktop and on a phone. */
const SCREENS = [
  { path: '/dashboard', heading: 'Početna' },
  { path: '/inventory', heading: 'Asortiman' },
  { path: '/warehouse', heading: 'Magacin' },
  { path: '/catalogs', heading: 'Katalozi' },
  { path: '/invoices', heading: 'Fakture' },
  { path: '/clients', heading: 'Kupci' },
  { path: '/finance', heading: 'Finansije' },
  { path: '/settings', heading: 'Podešavanja' },
]

test.describe('signed-in navigation', () => {
  for (const screen of SCREENS) {
    test(`${screen.heading} opens`, async ({ page }) => {
      await page.goto(screen.path)
      await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
      expect(await hasHorizontalOverflow(page), `${screen.path} scrolls sideways`).toBe(false)
    })
  }

  test('phone menu "Više" reaches the pages outside the tab bar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'tab bar exists only on phones')
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Više' }).click()
    const sheet = page.getByRole('dialog', { name: 'Više' })
    await sheet.getByRole('link', { name: 'Fakture' }).click()
    await expect(page).toHaveURL(/\/invoices$/)
    await expect(page.getByRole('heading', { name: 'Fakture', level: 1 })).toBeVisible()
  })
})
