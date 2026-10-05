import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const prisma = {
    profile: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    invoice: { findUniqueOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
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
import { POST } from './route'

const profile = { id: 'profile-a', clerkUserId: 'user-a', pib: '123456789', inVatSystem: true, accessExpiresAt: null }
const context = { params: Promise.resolve({ id: 'pr-1' }) }
const proforma = {
  id: 'pr-1',
  documentType: 'PROFORMA',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  dueDate: new Date('2026-10-08T10:00:00.000Z'),
  clientName: 'Market Primer d.o.o.',
  clientAddress: 'Beograd',
  clientPib: '987654321',
  items: [
    { productId: 'product-a', productName: 'Kafa 1 kg', quantity: 10, unitPrice: '1250', discount: '0', vatRate: '20' },
  ],
}

function request() {
  return new NextRequest('http://localhost/api/invoices/pr-1/convert', { method: 'POST' })
}

describe('POST /api/invoices/:id/convert (mocked Prisma/Clerk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.$queryRaw.mockResolvedValue([{ id: 'pr-1', documentType: 'PROFORMA', convertedInvoiceId: null }])
    mocks.invoice.findUniqueOrThrow.mockResolvedValue(proforma)
    mocks.invoice.findMany.mockResolvedValue([{ invoiceNumber: '04/2026' }])
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', costPrice: '900' }])
    mocks.invoice.create.mockResolvedValue({ id: 'inv-new', invoiceNumber: '05/2026' })
    mocks.$executeRaw.mockResolvedValue(1)
  })

  it('issues an invoice with the proforma lines, a new number, today costs and stock out', async () => {
    const response = await POST(request(), context)
    expect(response.status).toBe(201)

    const data = mocks.invoice.create.mock.calls[0][0].data
    expect(data.documentType).toBe('INVOICE')
    expect(data.invoiceNumber).toBe('05/2026')
    expect(data.status).toBe('UNPAID')
    expect(data.clientName).toBe('Market Primer d.o.o.')
    expect(data.totalAmount.toString()).toBe('15000')
    expect(data.vatAmount.toString()).toBe('2500')
    expect(data.items.create[0].unitCost.toString()).toBe('900')

    expect(stockMocks.syncInvoiceStock.mock.calls[0][1]).toMatchObject({ invoiceId: 'inv-new', status: 'UNPAID' })
    expect(mocks.invoice.update).toHaveBeenCalledWith({ where: { id: 'pr-1' }, data: { convertedInvoiceId: 'inv-new' } })
  })

  it('converts a proforma only once', async () => {
    mocks.$queryRaw.mockResolvedValue([{ id: 'pr-1', documentType: 'PROFORMA', convertedInvoiceId: 'inv-old' }])
    const response = await POST(request(), context)
    expect(response.status).toBe(409)
    expect(mocks.invoice.create).not.toHaveBeenCalled()
  })

  it('refuses to convert an invoice', async () => {
    mocks.$queryRaw.mockResolvedValue([{ id: 'pr-1', documentType: 'INVOICE', convertedInvoiceId: null }])
    const response = await POST(request(), context)
    expect(response.status).toBe(409)
    expect(mocks.invoice.create).not.toHaveBeenCalled()
  })

  it('returns 404 for another owner document', async () => {
    mocks.$queryRaw.mockResolvedValue([])
    const response = await POST(request(), context)
    expect(response.status).toBe(404)
  })

  it('is read-only for an expired account', async () => {
    mocks.profile.findUnique.mockResolvedValue({ ...profile, accessExpiresAt: new Date('2020-01-01') })
    const response = await POST(request(), context)
    expect(response.status).toBe(402)
    expect(mocks.$transaction).not.toHaveBeenCalled()
  })
})
