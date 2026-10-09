import { test, expect } from '../support/test'

/** A failed first load must not look like an empty account (ROADMAP A9.5). Read-only. */
test.describe('load errors', () => {
  for (const screen of [
    { path: '/invoices', api: '**/api/invoices', heading: 'Fakture', empty: 'Još nema faktura' },
    { path: '/inventory', api: '**/api/products', heading: 'Asortiman', empty: 'Asortiman je prazan' },
  ]) {
    test(`${screen.heading}: failed load offers "Pokušaj ponovo", not the first-run screen`, async ({ page }) => {
      let failing = true
      await page.route(screen.api, (route) =>
        failing ? route.fulfill({ status: 503, json: { error: 'Internal server error' } }) : route.continue()
      )
      await page.goto(screen.path)
      // TanStack Query retries 3 times before giving up.
      await expect(page.getByText('Podaci nisu učitani')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(screen.empty)).toHaveCount(0)

      failing = false
      await page.getByRole('button', { name: 'Pokušaj ponovo' }).click()
      await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
      await expect(page.getByText('Podaci nisu učitani')).toHaveCount(0)
    })
  }
})
