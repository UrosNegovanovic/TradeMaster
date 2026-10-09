import { test, expect } from '../support/test'

/** Everything outside src/lib/route-access.ts must stay behind Clerk. */
test.describe('access rules', () => {
  for (const path of ['/api/profile', '/api/products', '/api/invoices', '/api/clients', '/api/catalogs']) {
    test(`${path} answers 401 JSON without a session`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status()).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })
  }

  test('a write without a session is refused', async ({ request }) => {
    const response = await request.post('/api/products', { data: { name: 'x', sku: 'x' } })
    expect(response.status()).toBe(401)
  })

  for (const path of ['/dashboard', '/invoices', '/settings']) {
    test(`${path} sends a signed-out visitor away from the app`, async ({ page }) => {
      await page.goto(path)
      await expect(page).not.toHaveURL(new RegExp(`${path}$`))
    })
  }

  test('unknown public catalog and invoice links do not leak anything', async ({ request, page }) => {
    expect((await request.get('/api/public/catalogs/ckxxxxxxxxxxxxxxxxxxxxxxx')).status()).toBe(404)
    expect((await request.get('/api/shared/catalog/not-a-real-token')).status()).toBe(404)
    expect((await request.get('/api/shared/invoice/not-a-real-token')).status()).toBe(404)

    await page.goto('/shared/catalog/ckxxxxxxxxxxxxxxxxxxxxxxx')
    await expect(page.getByRole('heading', { name: 'Katalog nije pronađen' })).toBeVisible()
  })
})
