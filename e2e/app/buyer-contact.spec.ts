import { test, expect } from '../support/test'
import { e2eEnv } from '../support/env'
import { ensureCompanyProfile } from '../support/test-data'

const env = e2eEnv()

/** ROADMAP A9.21 / A9.22: a saved buyer's phone addresses the share link; the document keeps its note. */
test.describe('buyer contact and invoice note @writes', () => {
  test.skip(!env.writesAllowed, `writes disabled: ${env.writesBlockedReason}`)

  test('WhatsApp opens the buyer, the note is stored on the invoice', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one run is enough')
    await page.goto('/dashboard')
    const api = page.request
    await ensureCompanyProfile(api)
    const buyer = `E2E Kontakt ${Date.now().toString(36)}`

    const client = await api.post('/api/clients', { data: { name: buyer, phone: '064 123 4567', email: 'e2e@example.com' } })
    expect(client.ok(), await client.text()).toBeTruthy()
    const clientId = (await client.json()).id as string
    let invoiceId: string | undefined

    try {
      const created = await api.post('/api/invoices', {
        data: {
          dueDate: '2030-01-31',
          clientName: buyer,
          note: 'Reklamacije u roku od 8 dana.',
          items: [{ productId: null, free: true, productName: 'Usluga', quantity: 1, unitPrice: 100, discount: 0 }],
        },
      })
      expect(created.ok(), await created.text()).toBeTruthy()
      const invoice = await created.json()
      invoiceId = invoice.id
      expect(invoice.note).toBe('Reklamacije u roku od 8 dana.')

      await page.goto(`/invoices/${invoice.id}`)
      await page.getByRole('button', { name: 'Uključi deljenje' }).click()
      await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/381641234567\?text=/)
      await expect(page.getByRole('link', { name: /Mejl|Email/ })).toHaveAttribute('href', /^mailto:e2e%40example\.com\?/)
    } finally {
      if (invoiceId) await api.delete(`/api/invoices/${invoiceId}`)
      await api.delete(`/api/clients/${clientId}`)
    }
  })
})
