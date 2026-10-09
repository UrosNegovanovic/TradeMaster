import type { APIRequestContext } from '@playwright/test'
import { test, expect } from '../support/test'
import { e2eEnv } from '../support/env'
import { testCompany, uniqueSku } from '../support/test-data'

const env = e2eEnv()

/**
 * The money path: product → issued invoice → stock goes out → delete returns it.
 * Setup and checks go through the API; the invoice itself is made in the UI, like a user does.
 * Writes data, so it runs only where writes are allowed (support/env.ts).
 */
test.describe('invoice flow @writes', () => {
  test.skip(!env.writesAllowed, `writes disabled: ${env.writesBlockedReason}`)
  // One company per E2E user: run the money path serially on one browser.
  test.describe.configure({ mode: 'serial' })

  async function json(request: APIRequestContext, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown) {
    const response = await request.fetch(url, { method, data, headers: { 'Content-Type': 'application/json' } })
    expect(response.ok(), `${method} ${url} → ${response.status()} ${await response.text()}`).toBeTruthy()
    return response.status() === 204 ? null : response.json()
  }

  test('issuing an invoice takes stock out and deleting it puts stock back', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one run is enough; the phone layout is covered by navigation')
    await page.goto('/dashboard')
    const api = page.request
    await json(api, 'GET', '/api/profile')
    await json(api, 'PUT', '/api/profile', testCompany())

    const sku = uniqueSku('INV')
    const product = await json(api, 'POST', '/api/products', {
      name: `E2E proizvod ${sku}`,
      sku,
      quantity: 5,
      costPrice: '400',
      price: '1000',
    })

    try {
      await page.goto('/invoices/new')
      await page.getByLabel('Naziv kupca').fill('E2E Kupac DOO')
      await page.getByRole('button', { name: /Izaberi proizvod/ }).first().click()
      await page.getByLabel('Traži proizvod').fill(sku)
      await page.getByRole('listbox', { name: 'Proizvodi' }).getByText(sku).click()
      await page.getByLabel('Količina').first().fill('2')
      await page.getByRole('button', { name: 'Sačuvaj fakturu' }).click()
      await expect(page.getByText('Faktura je sačuvana')).toBeVisible()
      await expect(page).toHaveURL(/\/invoices$/)

      const stored = await json(api, 'GET', `/api/products/${product.id}`)
      expect(stored.quantity).toBe(3)

      const invoices: Array<{ id: string; clientName: string; items?: Array<{ productId: string }> }> = await json(api, 'GET', '/api/invoices')
      const invoice = invoices.find((row) => row.clientName === 'E2E Kupac DOO' && row.items?.some((item) => item.productId === product.id))
      expect(invoice, 'new invoice in the list').toBeTruthy()

      await json(api, 'DELETE', `/api/invoices/${invoice!.id}`)
      const restored = await json(api, 'GET', `/api/products/${product.id}`)
      expect(restored.quantity).toBe(5)
    } finally {
      await api.delete(`/api/products/${product.id}`)
    }
  })

  test('a free line (prevoz) is invoiced without a product and with cost of goods 0 (A9.11)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one run is enough')
    await page.goto('/dashboard')
    const api = page.request
    await json(api, 'PUT', '/api/profile', testCompany())
    const buyer = `E2E Usluga ${Date.now()}`

    await page.goto('/invoices/new')
    await page.getByLabel('Naziv kupca').fill(buyer)
    await page.getByRole('button', { name: 'Slobodna stavka (usluga, prevoz)' }).first().click()
    await page.getByLabel('Naziv slobodne stavke').first().fill('Prevoz robe')
    await page.getByLabel('Jedinična cena').first().fill('1500')
    await page.getByRole('button', { name: 'Sačuvaj fakturu' }).click()
    await expect(page.getByText('Faktura je sačuvana')).toBeVisible()

    const invoices: Array<{ id: string; clientName: string; items: Array<{ productId: string | null; productName: string; unitCost: string | null }> }> =
      await json(api, 'GET', '/api/invoices')
    const invoice = invoices.find((row) => row.clientName === buyer)
    expect(invoice?.items).toEqual([expect.objectContaining({ productId: null, productName: 'Prevoz robe', unitCost: '0' })])
    await json(api, 'DELETE', `/api/invoices/${invoice!.id}`)
  })
})
