import { test, expect } from '../support/test'

/** ROADMAP A9.14: "what needs completing" filters and order on Asortiman. Read-only. */
test.describe('Asortiman filters', () => {
  test('a filter from the address is selected and can be cleared', async ({ page }) => {
    await page.goto('/inventory?filter=missing-cost')
    await expect(page.getByRole('heading', { name: 'Asortiman', level: 1 })).toBeVisible()
    const group = page.getByRole('group', { name: 'Šta treba dopuniti' })
    await expect(group.getByRole('button', { name: /Bez nabavne cene/ })).toHaveAttribute('aria-pressed', 'true')
    await group.getByRole('button', { name: /^Svi/ }).click()
    await expect(group.getByRole('button', { name: /^Svi/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Redosled')).toHaveValue('newest')
  })
})
