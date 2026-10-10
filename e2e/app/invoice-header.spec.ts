import { test, expect } from '../support/test'
import { e2eEnv } from '../support/env'
import { ensureCompanyProfile } from '../support/test-data'

const env = e2eEnv()

/** ROADMAP A9.8: on a phone the invoice page shows two main actions; the rest sits under "Više radnji". */
test.describe('invoice page header @writes', () => {
  test.skip(!env.writesAllowed, `writes disabled: ${env.writesBlockedReason}`)

  test('main actions in view, secondary ones behind "Više radnji" on a phone', async ({ page, isMobile }) => {
    await page.goto('/dashboard')
    const api = page.request
    await ensureCompanyProfile(api)
    const created = await api.post('/api/invoices', {
      data: {
        dueDate: '2030-01-31',
        clientName: `E2E Zaglavlje ${Date.now()}`,
        items: [{ productId: null, free: true, productName: 'Usluga', quantity: 1, unitPrice: 100, discount: 0 }],
      },
    })
    expect(created.ok(), await created.text()).toBeTruthy()
    const invoice = await created.json()

    try {
      await page.goto(`/invoices/${invoice.id}`)
      await expect(page.getByRole('button', { name: 'Obeleži kao plaćeno' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Preuzmi PDF/ })).toBeVisible()

      const copy = page.getByRole('link', { name: 'Kopiraj' })
      if (isMobile) {
        await expect(copy).toBeHidden()
        await page.getByRole('button', { name: 'Više radnji' }).click()
      }
      await expect(copy).toBeVisible()
      await expect(page.getByRole('link', { name: 'Nazad na fakture' })).toBeVisible()
    } finally {
      await api.delete(`/api/invoices/${invoice.id}`)
    }
  })
})
