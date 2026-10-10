import type { APIRequestContext } from '@playwright/test'
import { test, expect } from '../support/test'
import { e2eEnv } from '../support/env'
import { ensureCompanyProfile, uniqueSku } from '../support/test-data'

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

  /** There is no GET /api/products/[id]: read the product's stock from the list. */
  async function stockOf(request: APIRequestContext, productId: string): Promise<number | undefined> {
    const products: Array<{ id: string; quantity: number }> = await json(request, 'GET', '/api/products')
    return products.find((product) => product.id === productId)?.quantity
  }

  // Buyers made by this worker; their documents are removed even after a failure (deleting an issued
  // invoice puts its stock back). Only these names: the phone and desktop projects run in parallel.
  const buyers = new Set<string>()
  const buyerName = (label: string) => {
    const name = `E2E ${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
    buyers.add(name)
    return name
  }

  test.afterAll(async ({ browser }) => {
    if (buyers.size === 0) return
    const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' })
    const page = await context.newPage()
    await page.goto('/dashboard')
    const invoices: Array<{ id: string; clientName: string }> = await json(page.request, 'GET', '/api/invoices')
    for (const invoice of invoices.filter((row) => buyers.has(row.clientName))) {
      await page.request.delete(`/api/invoices/${invoice.id}`)
    }
    await context.close()
  })

  test('issuing an invoice takes stock out and deleting it puts stock back', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one run is enough; the phone layout is covered by navigation')
    await page.goto('/dashboard')
    const api = page.request
    await ensureCompanyProfile(api)

    const sku = uniqueSku('INV')
    const product = await json(api, 'POST', '/api/products', {
      name: `E2E proizvod ${sku}`,
      sku,
      quantity: 5,
      costPrice: 400,
      price: 1000,
    })

    const buyer = buyerName('Kupac')
    try {
      await page.goto('/invoices/new')
      await page.getByLabel('Naziv kupca').fill(buyer)
      await page.getByRole('button', { name: /Izaberi proizvod/ }).first().click()
      await page.getByLabel('Traži proizvod').fill(sku)
      await page.getByRole('listbox', { name: 'Proizvodi' }).getByRole('option', { name: new RegExp(sku.slice(0, 20)) }).click()
      await page.getByLabel('Količina').first().fill('2')
      await page.getByRole('button', { name: 'Sačuvaj fakturu' }).click()
      await expect(page.getByText('Faktura je sačuvana')).toBeVisible()
      await expect(page).toHaveURL(/\/invoices$/)

      expect(await stockOf(api, product.id)).toBe(3)

      const invoices: Array<{ id: string; clientName: string; items?: Array<{ productId: string }> }> = await json(api, 'GET', '/api/invoices')
      const invoice = invoices.find((row) => row.clientName === buyer && row.items?.some((item) => item.productId === product.id))
      expect(invoice, 'new invoice in the list').toBeTruthy()

      await json(api, 'DELETE', `/api/invoices/${invoice!.id}`)
      expect(await stockOf(api, product.id)).toBe(5)
    } finally {
      await api.delete(`/api/products/${product.id}`)
    }
  })

  test('a free line (prevoz) is invoiced without a product and with cost of goods 0 (A9.11)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one run is enough')
    await page.goto('/dashboard')
    const api = page.request
    await ensureCompanyProfile(api)
    const buyer = buyerName('Usluga')

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

  test('a buyer saved from the invoice opens the next invoice from Kupci (A9.12)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one run is enough')
    await page.goto('/dashboard')
    const api = page.request
    await ensureCompanyProfile(api)
    const buyer = buyerName('Kupac')

    await page.goto('/invoices/new')
    await page.getByLabel('Naziv kupca').fill(buyer)
    await page.getByLabel('Sačuvaj kupca u Kupce').check()
    await page.getByRole('button', { name: 'Slobodna stavka (usluga, prevoz)' }).first().click()
    await page.getByLabel('Naziv slobodne stavke').first().fill('Usluga')
    await page.getByLabel('Jedinična cena').first().fill('100')
    await page.getByRole('button', { name: 'Sačuvaj fakturu' }).click()
    await expect(page.getByText('Faktura je sačuvana')).toBeVisible()

    const clients: Array<{ id: string; name: string }> = await json(api, 'GET', '/api/clients')
    const saved = clients.find((client) => client.name === buyer)
    expect(saved, 'buyer saved in Kupci').toBeTruthy()

    await page.goto('/clients')
    await page.getByRole('link', { name: `Novi predračun za ${buyer}` }).click()
    await expect(page.getByLabel('Naziv kupca')).toHaveValue(buyer)

    const invoices: Array<{ id: string; clientName: string }> = await json(api, 'GET', '/api/invoices')
    for (const row of invoices.filter((invoice) => invoice.clientName === buyer)) await api.delete(`/api/invoices/${row.id}`)
    await api.delete(`/api/clients/${saved!.id}`)
  })
})
