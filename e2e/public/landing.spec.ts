import { test, expect, hasHorizontalOverflow } from '../support/test'

const PUBLIC_PAGES = ['/', '/uslovi', '/privatnost', '/za/veleprodaju', '/za/preduzetnike', '/za/proizvodjace']

test.describe('public pages', () => {
  test('landing shows the offer and leads to sign-in', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/TradeMaster/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const signIn = page.getByRole('link', { name: 'Prijava' }).first()
    await expect(signIn).toHaveAttribute('href', '/sign-in')
  })

  for (const path of PUBLIC_PAGES) {
    test(`${path} renders without sideways scroll`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status(), `${path} status`).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await hasHorizontalOverflow(page), `${path} scrolls sideways`).toBe(false)
    })
  }

  test('sign-in page loads the Clerk form', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20_000 })
  })
})
