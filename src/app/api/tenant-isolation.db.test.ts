/**
 * Tenant isolation through the real route handlers (ROADMAP A2.3).
 * Company A is signed in and tries to read and change everything company B owns:
 * products, stock movements, clients, categories, catalogs and invoices.
 * Every read must hide B's rows, every write must be refused, and B's data must stay byte-for-byte the same.
 *
 * Prisma uses a privileged connection (no RLS), so this checks the application's profileId scoping.
 * Requires TEST_DATABASE_URL for a dedicated test database.
 */
import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

import * as productsRoute from './products/route'
import * as productRoute from './products/[id]/route'
import * as productLookupRoute from './products/lookup/route'
import * as bulkAdjustRoute from './products/bulk-adjust/route'
import * as stockMovementsRoute from './stock-movements/route'
import * as lowStockRoute from './warehouse/low-stock/route'
import * as stockListRoute from './warehouse/stock-list/route'
import * as clientsRoute from './clients/route'
import * as clientRoute from './clients/[id]/route'
import * as categoriesRoute from './categories/route'
import * as catalogsRoute from './catalogs/route'
import * as catalogRoute from './catalogs/[id]/route'
import * as invoicesRoute from './invoices/route'
import * as invoiceRoute from './invoices/[id]/route'
import * as invoiceShareRoute from './invoices/[id]/share/route'
import * as invoiceSefXmlRoute from './invoices/[id]/sef-xml/route'
import * as invoiceConvertRoute from './invoices/[id]/convert/route'
import * as invoiceExportRoute from './invoices/export/route'

const prefix = `tenant-${randomUUID()}`

const a = { clerkUserId: `${prefix}-a`, profileId: '', productId: '', catalogId: '', draftInvoiceId: '' }
const b = {
  clerkUserId: `${prefix}-b`,
  profileId: '',
  productId: '',
  sku: `${prefix}-sku-b`,
  categoryId: '',
  categoryName: `${prefix} B category`,
  clientId: '',
  catalogId: '',
  invoiceId: '',
  invoiceNumber: `${prefix}-B-001`,
  proformaId: '',
}

function url(path: string) {
  return `http://localhost/api/${path}`
}

function request(path: string, method = 'GET', body?: unknown) {
  return new NextRequest(url(path), {
    method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

const plain = (id: string) => ({ params: { id } })
const promised = (id: string) => ({ params: Promise.resolve({ id }) })

function expectDenied(response: Response) {
  // Some routes answer 403 for a foreign id, newer ones 404 (indistinguishable from missing). Both deny.
  expect([403, 404]).toContain(response.status)
}

async function jsonIds(response: Response): Promise<string[]> {
  expect(response.status).toBe(200)
  const body = (await response.json()) as Array<{ id: string }>
  return body.map((row) => row.id)
}

/** Everything company B owns, including updatedAt, so any write shows up as a difference. */
async function snapshotB() {
  const where = { profileId: b.profileId }
  const [products, categories, clients, catalogs, invoices, movements] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { id: 'asc' } }),
    prisma.category.findMany({ where, orderBy: { id: 'asc' } }),
    prisma.client.findMany({ where, orderBy: { id: 'asc' } }),
    prisma.catalog.findMany({ where, orderBy: { id: 'asc' }, include: { items: { orderBy: { id: 'asc' } } } }),
    prisma.invoice.findMany({ where, orderBy: { id: 'asc' }, include: { items: { orderBy: { id: 'asc' } } } }),
    prisma.stockMovement.findMany({ where, orderBy: { id: 'asc' } }),
  ])
  return JSON.parse(JSON.stringify({ products, categories, clients, catalogs, invoices, movements }))
}

let baseline: unknown

function belgradeYmd(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(date)
}

describe('tenant isolation against a dedicated test database', () => {
  beforeAll(async () => {
    const profileA = await prisma.profile.create({
      data: { clerkUserId: a.clerkUserId, companyName: `${prefix} A`, pib: '111111111' },
    })
    const profileB = await prisma.profile.create({
      data: {
        clerkUserId: b.clerkUserId,
        companyName: `${prefix} B`,
        pib: '222222222',
        registrationNumber: '22222222',
        giroAccount: '160-0000000000000-00',
      },
    })
    a.profileId = profileA.id
    b.profileId = profileB.id

    const productA = await prisma.product.create({
      data: { profileId: a.profileId, name: 'A product', sku: `${prefix}-sku-a`, price: 10, costPrice: 5, quantity: 50 },
    })
    a.productId = productA.id

    const categoryB = await prisma.category.create({ data: { profileId: b.profileId, name: b.categoryName } })
    b.categoryId = categoryB.id

    // Low stock on purpose, so B's product would show up in A's low-stock list if it leaked.
    const productB = await prisma.product.create({
      data: {
        profileId: b.profileId, name: 'B product', sku: b.sku, price: 20, costPrice: 12,
        quantity: 2, minStock: 5, categoryId: b.categoryId,
      },
    })
    b.productId = productB.id

    await prisma.stockMovement.create({
      data: { profileId: b.profileId, productId: b.productId, type: 'IN', quantity: 2, reason: 'B intake' },
    })

    const clientB = await prisma.client.create({
      data: { profileId: b.profileId, name: 'B buyer', pib: '333333333', registrationNumber: '33333333' },
    })
    b.clientId = clientB.id

    const catalogB = await prisma.catalog.create({
      data: {
        profileId: b.profileId, name: 'B offer', discount: 0,
        items: { create: { productId: b.productId, originalPrice: 20, discountedPrice: 20 } },
      },
    })
    b.catalogId = catalogB.id

    const invoiceB = await prisma.invoice.create({
      data: {
        profileId: b.profileId, invoiceNumber: b.invoiceNumber, dueDate: new Date('2030-01-01'),
        clientName: 'B buyer', clientPib: '333333333', status: 'UNPAID', totalAmount: 20,
        items: {
          create: { productId: b.productId, productName: 'B product', quantity: 1, unitPrice: 20, unitCost: 12, total: 20 },
        },
      },
    })
    b.invoiceId = invoiceB.id

    const proformaB = await prisma.invoice.create({
      data: {
        profileId: b.profileId, invoiceNumber: `${prefix}-PR-B-001`, dueDate: new Date('2030-01-01'),
        clientName: 'B buyer', status: 'UNPAID', documentType: 'PROFORMA', totalAmount: 20,
        items: {
          create: { productId: b.productId, productName: 'B product', quantity: 1, unitPrice: 20, unitCost: 12, total: 20 },
        },
      },
    })
    b.proformaId = proformaB.id

    const catalogA = await prisma.catalog.create({
      data: {
        profileId: a.profileId, name: 'A offer', discount: 0,
        items: { create: { productId: a.productId, originalPrice: 10, discountedPrice: 10 } },
      },
    })
    a.catalogId = catalogA.id

    const draftA = await prisma.invoice.create({
      data: {
        profileId: a.profileId, invoiceNumber: `${prefix}-A-001`, dueDate: new Date('2030-01-01'),
        clientName: 'A buyer', status: 'DRAFT', totalAmount: 10,
        items: { create: { productId: a.productId, productName: 'A product', quantity: 1, unitPrice: 10, total: 10 } },
      },
    })
    a.draftInvoiceId = draftA.id

    baseline = await snapshotB()
  })

  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(auth).mockResolvedValue({ userId: a.clerkUserId } as never)
  })

  afterAll(async () => {
    try {
      const ids = [a.profileId, b.profileId].filter(Boolean)
      if (ids.length) {
        await prisma.invoice.deleteMany({ where: { profileId: { in: ids } } })
        await prisma.profile.deleteMany({ where: { id: { in: ids } } })
      }
    } finally {
      await prisma.$disconnect()
    }
  })

  describe('reads never return company B rows', () => {
    it('products, lookup by SKU and low stock', async () => {
      const products = await jsonIds(await productsRoute.GET())
      expect(products).toContain(a.productId)
      expect(products).not.toContain(b.productId)

      const lookup = await productLookupRoute.GET(request(`products/lookup?sku=${encodeURIComponent(b.sku)}`))
      expect(lookup.status).toBe(404)

      const lowStock = await lowStockRoute.GET()
      expect(lowStock.status).toBe(200)
      expect(JSON.stringify(await lowStock.json())).not.toContain(b.productId)

      // Lager lista (ROADMAP A9.19) lists only A's products.
      const stockList = await stockListRoute.GET(request('warehouse/stock-list?format=csv'))
      expect(stockList.status).toBe(200)
      const csv = await stockList.text()
      expect(csv).not.toContain(b.sku)
    })

    it('stock movements, also when filtered by a B product id', async () => {
      expect(await jsonIds(await stockMovementsRoute.GET(request('stock-movements?all=1')))).toEqual([])
      const filtered = await stockMovementsRoute.GET(request(`stock-movements?productId=${b.productId}`))
      expect(await jsonIds(filtered)).toEqual([])
      expect(filtered.headers.get('X-Total-Count')).toBe('0')
    })

    it('clients and categories', async () => {
      expect(await jsonIds(await clientsRoute.GET())).not.toContain(b.clientId)
      expect(await jsonIds(await categoriesRoute.GET())).not.toContain(b.categoryId)
    })

    it('catalogs: list and by id', async () => {
      const catalogs = await jsonIds(await catalogsRoute.GET())
      expect(catalogs).toContain(a.catalogId)
      expect(catalogs).not.toContain(b.catalogId)
      expectDenied(await catalogRoute.GET(request(`catalogs/${b.catalogId}`), plain(b.catalogId)))
    })

    it('invoices: list, by id, share link, SEF XML and accountant export', async () => {
      const invoices = await jsonIds(await invoicesRoute.GET())
      expect(invoices).toContain(a.draftInvoiceId)
      expect(invoices).not.toContain(b.invoiceId)
      expect(invoices).not.toContain(b.proformaId)

      expectDenied(await invoiceRoute.GET(request(`invoices/${b.invoiceId}`), promised(b.invoiceId)))
      expectDenied(await invoiceShareRoute.GET(request(`invoices/${b.invoiceId}/share`), plain(b.invoiceId)))
      expectDenied(await invoiceSefXmlRoute.GET(request(`invoices/${b.invoiceId}/sef-xml`), promised(b.invoiceId)))

      const exported = await invoiceExportRoute.GET(
        request(`invoices/export?format=csv&from=${belgradeYmd(-1)}&to=${belgradeYmd(1)}`)
      )
      expect(exported.status).toBe(200)
      const csv = await exported.text()
      expect(csv).not.toContain(b.invoiceNumber)
      expect(csv).not.toContain('B buyer')
    })
  })

  describe('writes on company B records are refused', () => {
    it('product edit and delete', async () => {
      const hijack = { name: 'Hijacked', sku: b.sku, price: 1, costPrice: 1, quantity: 999 }
      expectDenied(await productRoute.PUT(request(`products/${b.productId}`, 'PUT', hijack), plain(b.productId)))
      expectDenied(await productRoute.DELETE(request(`products/${b.productId}`, 'DELETE'), plain(b.productId)))
      expect(await snapshotB()).toEqual(baseline)
    })

    it('stock in/out and bulk adjust by B SKU', async () => {
      for (const type of ['IN', 'OUT'] as const) {
        const response = await stockMovementsRoute.POST(
          request('stock-movements', 'POST', { productId: b.productId, type, quantity: 1, reason: 'Hijack' })
        )
        expectDenied(response)
      }
      const adjust = await bulkAdjustRoute.POST(request('products/bulk-adjust', 'POST', { sku: b.sku, quantity: 999 }))
      expect(adjust.status).toBe(404)
      expect(await snapshotB()).toEqual(baseline)
    })

    it('intake with B SKU creates an A product and leaves B alone', async () => {
      const response = await productsRoute.POST(
        request('products', 'POST', { name: 'Same SKU, other company', sku: b.sku, quantity: 3, price: 0 })
      )
      expect(response.status).toBeLessThan(300)
      const own = await prisma.product.findMany({ where: { profileId: a.profileId, sku: b.sku } })
      expect(own).toHaveLength(1)
      expect(own[0].quantity).toBe(3)
      expect(await snapshotB()).toEqual(baseline)
    })

    it('client edit and delete', async () => {
      expectDenied(await clientRoute.PUT(request(`clients/${b.clientId}`, 'PUT', { name: 'Hijacked' }), promised(b.clientId)))
      expectDenied(await clientRoute.DELETE(request(`clients/${b.clientId}`, 'DELETE'), promised(b.clientId)))
      expect(await snapshotB()).toEqual(baseline)
    })

    it('category with the same name is A-only', async () => {
      const response = await categoriesRoute.POST(request('categories', 'POST', { name: b.categoryName }))
      expect(response.status).toBe(201)
      expect((await response.json()).id).not.toBe(b.categoryId)
      expect(await snapshotB()).toEqual(baseline)
    })

    it('catalog edit and delete, and B products in A catalogs', async () => {
      const body = { name: 'Hijacked', discount: 50, productIds: [b.productId] }
      expectDenied(await catalogRoute.PATCH(request(`catalogs/${b.catalogId}`, 'PATCH', body), plain(b.catalogId)))
      expectDenied(await catalogRoute.DELETE(request(`catalogs/${b.catalogId}`, 'DELETE'), plain(b.catalogId)))

      const create = await catalogsRoute.POST(request('catalogs', 'POST', { name: 'A with B product', discount: 0, productIds: [b.productId] }))
      expect(create.status).toBe(400)
      const patchOwn = await catalogRoute.PATCH(
        request(`catalogs/${a.catalogId}`, 'PATCH', { name: 'A offer', discount: 0, productIds: [a.productId, b.productId] }),
        plain(a.catalogId)
      )
      expect(patchOwn.status).toBe(400)
      const ownItems = await prisma.catalogItem.findMany({ where: { catalogId: a.catalogId } })
      expect(ownItems.map((item) => item.productId)).toEqual([a.productId])
      expect(await snapshotB()).toEqual(baseline)
    })

    it('invoice edit, status change, delete, share, convert', async () => {
      const write = {
        invoiceNumber: 'Hijacked', dueDate: '2030-02-01', clientName: 'Hijacked',
        items: [{ productId: b.productId, productName: 'B product', quantity: 1, unitPrice: 1, discount: 0 }],
      }
      expectDenied(await invoiceRoute.PUT(request(`invoices/${b.invoiceId}`, 'PUT', write), promised(b.invoiceId)))
      expectDenied(await invoiceRoute.PATCH(request(`invoices/${b.invoiceId}`, 'PATCH', { status: 'PAID' }), promised(b.invoiceId)))
      expectDenied(await invoiceRoute.DELETE(request(`invoices/${b.invoiceId}`, 'DELETE'), promised(b.invoiceId)))
      expectDenied(await invoiceShareRoute.POST(request(`invoices/${b.invoiceId}/share`, 'POST'), plain(b.invoiceId)))
      expectDenied(await invoiceShareRoute.DELETE(request(`invoices/${b.invoiceId}/share`, 'DELETE'), plain(b.invoiceId)))
      expectDenied(await invoiceConvertRoute.POST(request(`invoices/${b.proformaId}/convert`, 'POST'), promised(b.proformaId)))
      expect(await snapshotB()).toEqual(baseline)
    })

    it('B products on A invoices are refused on create and edit', async () => {
      const line = { productId: b.productId, productName: 'B product', quantity: 1, unitPrice: 20, discount: 0 }
      const create = await invoicesRoute.POST(
        request('invoices', 'POST', { dueDate: '2030-02-01', clientName: 'A buyer', status: 'DRAFT', items: [line] })
      )
      expect(create.status).toBe(400)

      const edit = await invoiceRoute.PUT(
        request(`invoices/${a.draftInvoiceId}`, 'PUT', {
          invoiceNumber: `${prefix}-A-001`, dueDate: '2030-02-01', clientName: 'A buyer', items: [line],
        }),
        promised(a.draftInvoiceId)
      )
      expect(edit.status).toBe(400)
      const draftItems = await prisma.invoiceItem.findMany({ where: { invoiceId: a.draftInvoiceId } })
      expect(draftItems.map((item) => item.productId)).toEqual([a.productId])
      expect(await snapshotB()).toEqual(baseline)
    })
  })
})
