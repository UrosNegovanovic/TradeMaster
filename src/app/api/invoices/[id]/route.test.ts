import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const prisma = {
    profile: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    invoice: { findFirst: vi.fn(), update: vi.fn() },
    invoiceItem: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma))
  return prisma
})

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { PATCH, PUT } from './route'

const profile = { id: 'profile-a', clerkUserId: 'user-a' }
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
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.invoice.findFirst.mockResolvedValue(paidInvoice)
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a' }])
    mocks.invoice.update.mockResolvedValue({ ...paidInvoice, items: [] })
  })

  it('does not write status even when a valid UI DRAFT payload is sent', async () => {
    const response = await PUT(
      request('PUT', { ...validPutBody, status: 'DRAFT' }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBeUndefined()
    expect(mocks.invoice.update.mock.calls[0][0].data.totalAmount.toString()).toBe('8')
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
    mocks.invoice.findFirst.mockResolvedValue(null)
    const response = await PUT(request('PUT', validPutBody), context)
    expect(response.status).toBe(404)
    expect(mocks.$transaction).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/invoices/:id (mocked Prisma/Clerk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.invoice.findFirst.mockResolvedValue(paidInvoice)
    mocks.invoice.update.mockResolvedValue({ ...paidInvoice, status: 'UNPAID' })
  })

  it('updates status through PATCH after validating the enum', async () => {
    const response = await PATCH(request('PATCH', { status: 'UNPAID' }), context)
    expect(response.status).toBe(200)
    expect(mocks.invoice.update.mock.calls[0][0].data.status).toBe('UNPAID')
  })

  it('rejects an unsupported PATCH body', async () => {
    const response = await PATCH(request('PATCH', { status: 'CANCELLED' }), context)
    expect(response.status).toBe(400)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })
})
