import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const prisma = {
    profile: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    invoice: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    invoiceItem: { deleteMany: vi.fn(), create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma))
  return prisma
})

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

const stockMocks = vi.hoisted(() => ({
  syncInvoiceStock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/invoice-stock', () => stockMocks)

import { auth } from '@clerk/nextjs/server'
import { DELETE, PATCH, PUT } from './route'

const profile = { id: 'profile-a', clerkUserId: 'user-a' }
const unpaidInvoice = {
  id: 'inv-open',
  profileId: profile.id,
  status: 'UNPAID',
  invoiceNumber: '2026-010',
}
const paidInvoice = {
  id: 'inv-paid',
  profileId: profile.id,
  status: 'PAID',
  invoiceNumber: '2026-010',
}

function request(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/invoices/inv-paid', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = { params: Promise.resolve({ id: 'inv-paid' }) }

const validPutBody = {
  invoiceNumber: '2026-010',
  dueDate: '2026-11-01',
  clientName: 'Acme',
  items: [
    {
      productId: 'product-a',
      productName: 'Coffee',
      quantity: 1,
      unitPrice: 8,
      discount: 0,
      total: 1,
    },
  ],
}

describe('PUT /api/invoices/:id (mocked Prisma/Clerk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.invoice.findFirst.mockResolvedValue(unpaidInvoice)
    mocks.$queryRaw.mockResolvedValue([{ id: unpaidInvoice.id, status: 'UNPAID' }])
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', costPrice: '6.25' }])
    mocks.invoice.update.mockResolvedValue({ ...unpaidInvoice, items: [] })
    mocks.$executeRaw.mockResolvedValue(1)
  })

  it('does not write status even when a valid UI DRAFT payload is sent', async () => {
    const response = await PUT(
      request('PUT', { ...validPutBody, status: 'DRAFT' }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBeUndefined()
    expect(mocks.invoice.update.mock.calls[0][0].data.totalAmount.toString()).toBe('8')
    expect(mocks.invoice.update.mock.calls[0][0].data.items.create[0].unitCost.toString()).toBe('6.25')
  })

  it('rejects an invalid status on PUT without writing', async () => {
    const response = await PUT(
      request('PUT', { ...validPutBody, status: 'CANCELLED' }),
      context
    )

    expect(response.status).toBe(400)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })

  it('returns 404 for another owner invoice', async () => {
    mocks.$queryRaw.mockResolvedValue([])
    const response = await PUT(request('PUT', validPutBody), context)
    expect(response.status).toBe(404)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })

  it('rejects PUT on a paid invoice without changing items or totals', async () => {
    mocks.$queryRaw.mockResolvedValue([{ id: paidInvoice.id, status: 'PAID' }])
    const response = await PUT(request('PUT', validPutBody), context)
    expect(response.status).toBe(409)
    expect(mocks.invoiceItem.deleteMany).not.toHaveBeenCalled()
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })
})

describe('PUT /api/invoices/:id PDV (mocked Prisma/Clerk)', () => {
  const vatPutBody = {
    ...validPutBody,
    items: [{ ...validPutBody.items[0], unitPrice: 100, vatRate: 20 }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', costPrice: '6.25' }])
    mocks.invoice.update.mockResolvedValue({ ...unpaidInvoice, items: [] })
  })

  it('keeps the PDV setting an issued invoice was issued with, even if the company changed it', async () => {
    // Issued without PDV; the company has since entered the PDV system.
    mocks.profile.findUnique.mockResolvedValue({ ...profile, inVatSystem: true })
    mocks.$queryRaw.mockResolvedValue([{ id: 'inv-open', status: 'UNPAID', vatEnabled: false }])

    await PUT(request('PUT', vatPutBody), context)

    const data = mocks.invoice.update.mock.calls[0][0].data
    expect(data.vatEnabled).toBe(false)
    expect(data.vatAmount.toString()).toBe('0')
    expect(data.totalAmount.toString()).toBe('100')
    expect(data.items.create[0].vatRate.toString()).toBe('0')
  })

  it('lets a draft follow the current company setting', async () => {
    mocks.profile.findUnique.mockResolvedValue({ ...profile, inVatSystem: true })
    mocks.$queryRaw.mockResolvedValue([{ id: 'inv-open', status: 'DRAFT', vatEnabled: false }])

    await PUT(request('PUT', vatPutBody), context)

    const data = mocks.invoice.update.mock.calls[0][0].data
    expect(data.vatEnabled).toBe(true)
    expect(data.vatAmount.toString()).toBe('20')
    expect(data.totalAmount.toString()).toBe('120')
    expect(data.items.create[0].vatRate.toString()).toBe('20')
  })
})

describe('PATCH /api/invoices/:id (mocked Prisma/Clerk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.invoice.findFirst.mockResolvedValue(paidInvoice)
    mocks.$queryRaw.mockResolvedValue([
      { id: paidInvoice.id, status: 'PAID', invoiceNumber: paidInvoice.invoiceNumber, paidAt: null },
    ])
    mocks.invoice.update.mockResolvedValue({ ...paidInvoice, status: 'UNPAID', items: [] })
  })

  it('updates status through PATCH after validating the enum', async () => {
    const response = await PATCH(request('PATCH', { status: 'UNPAID' }), context)
    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBe('UNPAID')
    expect(mocks.invoice.update.mock.calls[0][0].data.paidAt).toBeNull()
    expect(stockMocks.syncInvoiceStock).toHaveBeenCalledTimes(1)
  })

  it('stamps paidAt when an open invoice is marked paid', async () => {
    mocks.$queryRaw.mockResolvedValue([
      { id: unpaidInvoice.id, status: 'UNPAID', invoiceNumber: unpaidInvoice.invoiceNumber, paidAt: null },
    ])
    mocks.invoice.update.mockResolvedValue({ ...unpaidInvoice, status: 'PAID', items: [] })
    const response = await PATCH(request('PATCH', { status: 'PAID' }), {
      params: Promise.resolve({ id: unpaidInvoice.id }),
    })
    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBe('PAID')
    expect(mocks.invoice.update.mock.calls[0][0].data.paidAt).toBeInstanceOf(Date)
  })

  it('refreshes cost snapshots when a draft invoice is issued', async () => {
    mocks.$queryRaw.mockResolvedValue([
      { id: 'inv-draft', status: 'DRAFT', invoiceNumber: '2026-011', paidAt: null },
    ])
    mocks.invoice.update.mockResolvedValue({
      ...unpaidInvoice,
      id: 'inv-draft',
      invoiceNumber: '2026-011',
      items: [],
    })

    const response = await PATCH(request('PATCH', { status: 'UNPAID' }), {
      params: Promise.resolve({ id: 'inv-draft' }),
    })

    expect(response.status).toBe(200)
    expect(mocks.$executeRaw).toHaveBeenCalledTimes(1)
  })

  it('keeps the original paidAt if the invoice is already paid', async () => {
    const paidAt = new Date('2026-01-15T10:00:00.000Z')
    mocks.$queryRaw.mockResolvedValue([
      { id: paidInvoice.id, status: 'PAID', invoiceNumber: paidInvoice.invoiceNumber, paidAt },
    ])
    mocks.invoice.update.mockResolvedValue({ ...paidInvoice, paidAt, items: [] })
    const response = await PATCH(request('PATCH', { status: 'PAID' }), context)
    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBe('PAID')
    expect(mocks.invoice.update.mock.calls[0][0].data.paidAt).toBeUndefined()
  })

  it('rejects content changes on a paid invoice', async () => {
    const response = await PATCH(request('PATCH', { clientName: 'Changed' }), context)
    expect(response.status).toBe(409)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
    expect(stockMocks.syncInvoiceStock).not.toHaveBeenCalled()
  })

  it('rejects an unsupported PATCH body', async () => {
    const response = await PATCH(request('PATCH', { status: 'CANCELLED' }), context)
    expect(response.status).toBe(400)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })
})

describe('proforma (predračun) on /api/invoices/:id (mocked Prisma/Clerk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', costPrice: '6.25' }])
  })

  it('refuses to mark a proforma paid', async () => {
    mocks.$queryRaw.mockResolvedValue([
      { id: 'pr-1', status: 'UNPAID', invoiceNumber: 'PR-01/2026', paidAt: null, documentType: 'PROFORMA' },
    ])
    const response = await PATCH(request('PATCH', { status: 'PAID' }), context)
    expect(response.status).toBe(409)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
    expect(stockMocks.syncInvoiceStock).not.toHaveBeenCalled()
  })

  it('issues a proforma without taking stock', async () => {
    mocks.$queryRaw.mockResolvedValue([
      { id: 'pr-1', status: 'DRAFT', invoiceNumber: 'PR-01/2026', paidAt: null, documentType: 'PROFORMA' },
    ])
    mocks.invoice.update.mockResolvedValue({
      id: 'pr-1',
      status: 'UNPAID',
      invoiceNumber: 'PR-01/2026',
      documentType: 'PROFORMA',
      items: [{ productId: 'product-a', quantity: 3 }],
    })
    const response = await PATCH(request('PATCH', { status: 'UNPAID' }), context)
    expect(response.status).toBe(200)
    expect(stockMocks.syncInvoiceStock.mock.calls[0][1].status).toBe('DRAFT')
  })

  it('edits an open proforma without taking stock', async () => {
    mocks.$queryRaw.mockResolvedValue([
      { id: 'pr-1', status: 'UNPAID', vatEnabled: false, documentType: 'PROFORMA', convertedInvoiceId: null },
    ])
    mocks.invoice.update.mockResolvedValue({ id: 'pr-1', items: [] })
    const response = await PUT(request('PUT', validPutBody), context)
    expect(response.status).toBe(200)
    expect(stockMocks.syncInvoiceStock.mock.calls[0][1].status).toBe('DRAFT')
  })

  it('locks a proforma that was already turned into an invoice', async () => {
    mocks.$queryRaw.mockResolvedValue([
      { id: 'pr-1', status: 'UNPAID', vatEnabled: false, documentType: 'PROFORMA', convertedInvoiceId: 'inv-9' },
    ])
    const response = await PUT(request('PUT', validPutBody), context)
    expect(response.status).toBe(409)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })
})

describe('invoice sent to SEF is locked (ROADMAP A3)', () => {
  const sentRow = { id: unpaidInvoice.id, status: 'UNPAID', invoiceNumber: '01/2026', paidAt: null, vatEnabled: false, documentType: 'INVOICE', convertedInvoiceId: null, sefStatus: 'SENT' }

  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.$queryRaw.mockResolvedValue([sentRow])
    mocks.invoice.update.mockResolvedValue({ ...unpaidInvoice, status: 'PAID', items: [] })
  })

  it('refuses PUT, content PATCH and going back to draft', async () => {
    for (const response of [
      await PUT(request('PUT', validPutBody), context),
      await PATCH(request('PATCH', { clientName: 'Changed' }), context),
      await PATCH(request('PATCH', { status: 'DRAFT' }), context),
    ]) {
      expect(response.status).toBe(409)
      await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/poslata u SEF/) })
    }
    expect(mocks.invoice.update).not.toHaveBeenCalled()
    expect(mocks.invoiceItem.deleteMany).not.toHaveBeenCalled()
  })

  it('still lets the owner mark it paid', async () => {
    const response = await PATCH(request('PATCH', { status: 'PAID' }), context)
    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBe('PAID')
  })

  it('refuses DELETE', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ ...unpaidInvoice, sefStatus: 'SENDING', items: [] })
    const response = await DELETE(request('DELETE', {}), context)
    expect(response.status).toBe(409)
    expect(mocks.invoice.delete).not.toHaveBeenCalled()
    expect(stockMocks.syncInvoiceStock).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/invoices/:id keeps paid invoices (ROADMAP A9.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
  })

  it('refuses to delete a paid invoice: booked revenue and stock stay as they are', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ ...paidInvoice, sefStatus: null, items: [] })
    const response = await DELETE(request('DELETE', {}), context)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/Plaćena faktura/) })
    expect(mocks.invoice.delete).not.toHaveBeenCalled()
    expect(stockMocks.syncInvoiceStock).not.toHaveBeenCalled()
  })

  it('still deletes an open invoice and returns its stock', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ ...unpaidInvoice, sefStatus: null, items: [] })
    const response = await DELETE(request('DELETE', {}), context)
    expect(response.status).toBe(200)
    expect(stockMocks.syncInvoiceStock).toHaveBeenCalledWith(mocks, expect.objectContaining({ status: 'DRAFT' }))
    expect(mocks.invoice.delete).toHaveBeenCalled()
  })
})
