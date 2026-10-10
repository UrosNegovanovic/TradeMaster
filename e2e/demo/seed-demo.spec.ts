import { mkdirSync, writeFileSync } from 'node:fs'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { demoCatalogSkus, demoClients, demoCompany, demoProducts, packshotHtml } from './demo-company'

/**
 * Seeds the demo company (ROADMAP A1.7) through the app's own API, signed in as DEMO_USER_EMAIL.
 * Run: DEMO_SEED=1 DEMO_USER_EMAIL=... npx playwright test --project=demo-seed
 * Refuses an account that already has products, so it never mixes demo data into a real company.
 * Writes the public links to playwright/.demo/demo-links.json (gitignored).
 */
test('seed the demo company', async ({ page, browser }) => {
  test.setTimeout(10 * 60_000)
  const email = process.env.DEMO_USER_EMAIL
  expect(email, 'set DEMO_USER_EMAIL').toBeTruthy()

  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY })
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: email! })
  const api = page.request

  const call = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, data?: unknown) => {
    const response = await api.fetch(url, { method, data })
    expect(response.ok(), `${method} ${url} → ${response.status()} ${await response.text()}`).toBeTruthy()
    return response.json()
  }

  await call('GET', '/api/profile')
  const existing: unknown[] = await call('GET', '/api/products')
  expect(existing.length, 'the demo account must be empty (no products)').toBe(0)
  await call('PUT', '/api/profile', demoCompany)

  // Categories
  const categoryIds = new Map<string, string>()
  for (const name of [...new Set(demoProducts.map((product) => product.category))]) {
    const category = await call('POST', '/api/categories', { name })
    categoryIds.set(name, category.id)
  }

  // Images: rendered packshots, uploaded like a user upload (skip with DEMO_IMAGES=0).
  const withImages = process.env.DEMO_IMAGES !== '0'
  const renderer = withImages ? await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 }) : null
  const productIds = new Map<string, string>()
  for (const product of demoProducts) {
    let imageUrl: string | undefined
    if (renderer) {
      await renderer.setContent(packshotHtml(product))
      const buffer = await renderer.locator('body').screenshot({ type: 'png' })
      const upload = await upload_(api, buffer, `${product.sku}.png`)
      imageUrl = upload
    }
    const created = await call('POST', '/api/products', {
      name: product.name,
      sku: product.sku,
      quantity: product.quantity,
      price: product.price,
      costPrice: product.costPrice,
      minStock: product.minStock,
      categoryId: categoryIds.get(product.category),
      ...(imageUrl ? { imageUrl } : {}),
    })
    productIds.set(product.sku, created.id)
  }
  await renderer?.close()

  for (const client of demoClients) await call('POST', '/api/clients', client)

  // Catalog for the first buyer, shared
  const catalog = await call('POST', '/api/catalogs', {
    name: 'Ponuda za oktobar',
    clientName: demoClients[0].name,
    discount: 10,
    notes: 'Cene bez PDV-a. Isporuka u roku od 2 radna dana.',
    productIds: demoCatalogSkus.map((sku) => productIds.get(sku)),
    layout: 'GRID_4',
    groupByCategory: true,
    sortMode: 'MANUAL',
    showSku: true,
    showDescription: true,
    showOriginalPrice: true,
  })
  const catalogShare = await call('POST', `/api/catalogs/${catalog.id}/share`)

  const line = (sku: string, quantity: number, discount = 0) => {
    const product = demoProducts.find((row) => row.sku === sku)!
    return { productId: productIds.get(sku), productName: product.name, quantity, unitPrice: product.price, discount, vatRate: 20 }
  }
  const buyer = (index: number) => ({
    clientName: demoClients[index].name,
    clientAddress: demoClients[index].address,
  })
  const due = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

  // Predračun from the catalog's buyer
  const proforma = await call('POST', '/api/invoices', {
    ...buyer(0),
    documentType: 'PROFORMA',
    status: 'UNPAID',
    dueDate: due(7),
    note: demoCompany.invoiceNote,
    items: [line('DM-1001', 24, 10), line('DM-2002', 30, 10), line('DM-3001', 60, 10), line('DM-5001', 12, 10)],
  })

  // Open invoice with IPS QR (bank 999 belongs to no bank), shared
  const openInvoice = await call('POST', '/api/invoices', {
    ...buyer(1),
    status: 'UNPAID',
    dueDate: due(15),
    note: demoCompany.invoiceNote,
    items: [
      line('DM-2006', 40),
      line('DM-3003', 12),
      line('DM-4001', 10),
      { productId: null, free: true, productName: 'Prevoz do kupca', quantity: 1, unitPrice: 1500, discount: 0, vatRate: 20 },
    ],
  })
  const invoiceShare = await call('POST', `/api/invoices/${openInvoice.id}/share`)

  // Two paid invoices, so Finansije has numbers
  for (const [index, items] of [
    [2, [line('DM-1002', 3), line('DM-3002', 48), line('DM-2001', 20)]],
    [0, [line('DM-4003', 4), line('DM-4004', 6), line('DM-5002', 20), line('DM-5003', 30)]],
  ] as const) {
    const paid = await call('POST', '/api/invoices', { ...buyer(index), status: 'UNPAID', dueDate: due(15), items })
    await call('PATCH', `/api/invoices/${paid.id}`, { status: 'PAID' })
  }

  const links = {
    catalogPath: catalogShare.url as string,
    invoicePath: invoiceShare.url as string,
    proformaId: proforma.id as string,
  }
  mkdirSync('playwright/.demo', { recursive: true })
  writeFileSync('playwright/.demo/demo-links.json', JSON.stringify(links, null, 2))
  console.log('DEMO LINKS', JSON.stringify(links))
})

async function upload_(api: APIRequestContext, buffer: Buffer, name: string): Promise<string> {
  const response = await api.post('/api/uploads', {
    multipart: { bucket: 'product-images', file: { name, mimeType: 'image/png', buffer } },
  })
  expect(response.ok(), `upload ${name} → ${response.status()} ${await response.text()}`).toBeTruthy()
  return (await response.json()).url
}
