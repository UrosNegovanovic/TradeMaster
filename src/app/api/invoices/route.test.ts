import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const prisma = {
    profile: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    invoice: { findMany: vi.fn(), create: vi.fn() },
    invoiceItem: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma))
  return prisma
})

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { POST } from './route'

const profile = {
  id: 'profile-a',
  clerkUserId: 'user-a',
}

const ownedProduct = {
  id: 'product-a',
}

function postRequest(body: unknown, raw?: string) {
  return new NextRequest('http://localhost/api/invoices', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  })
}

describe('POST /api/invoices (mocked Prisma/Clerk — not a real DB rollback proof)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaTransactionReset()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.product.findMany.mockResolvedValue([ownedProduct])
    mocks.invoice.create.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: '2026-001',
      status: 'DRAFT',
      totalAmount: 21,
      profileId: profile.id,
    })
    mocks.invoiceItem.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'item-1',
      ...data,
    }))
  })

  function prismaTransactionReset() {
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
  }

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const response = await POST(postRequest({}))
    expect(response.status).toBe(401)
  })

  it('returns 404 when the user has no profile', async () => {
    mocks.profile.findUnique.mockResolvedValue(null)
    const response = await POST(
      postRequest({
        invoiceNumber: '2026-001',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: 'product-a',
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 10.5,
            discount: 0,
          },
        ],
      })
    )
    expect(response.status).toBe(404)
  })

  it('returns 400 for invalid JSON', async () => {
    const response = await POST(postRequest({}, '{'))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'Invalid JSON' })
  })

  it('rejects another owner product and a missing product', async () => {
    mocks.product.findMany.mockResolvedValue([])

    const foreign = await POST(
      postRequest({
        invoiceNumber: '2026-001',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: 'product-b',
            productName: 'Tea',
            quantity: 1,
            unitPrice: 5,
            discount: 0,
          },
        ],
      })
    )
    expect(foreign.status).toBe(400)
    expect(mocks.invoice.create).not.toHaveBeenCalled()

    const missing = await POST(
      postRequest({
        invoiceNumber: '2026-002',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: 'does-not-exist',
            productName: 'Ghost',
            quantity: 1,
            unitPrice: 5,
            discount: 0,
          },
        ],
      })
    )
    expect(missing.status).toBe(400)
  })

  it('allows the same owned product on multiple lines and a manual line', async () => {
    const response = await POST(
      postRequest({
        invoiceNumber: '2026-003',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: 'product-a',
            productName: 'Coffee',
            quantity: 1,
            unitPrice: 10,
            discount: 0,
          },
          {
            productId: 'product-a',
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 10,
            discount: 0,
          },
          {
            productId: null,
            productName: 'Manual delivery',
            quantity: 1,
            unitPrice: 3.5,
            discount: 0,
          },
        ],
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['product-a'] }, profileId: profile.id },
      select: { id: true },
    })
    expect(mocks.invoiceItem.create).toHaveBeenCalledTimes(3)
  })

  it('ignores forged client totals and stores server-calculated amounts', async () => {
    const invalidPrecision = await POST(
      postRequest({
        invoiceNumber: '2026-004',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        totalAmount: 1,
        items: [
          {
            productId: 'product-a',
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 10.555,
            discount: 0,
            total: 1,
          },
        ],
      })
    )
    expect(invalidPrecision.status).toBe(400)

    const response = await POST(
      postRequest({
        invoiceNumber: '2026-004',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        totalAmount: 1,
        items: [
          {
            productId: 'product-a',
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 10.55,
            discount: 0,
            total: 1,
          },
        ],
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.invoice.create.mock.calls[0][0].data.totalAmount.toString()).toBe('21.1')
    expect(mocks.invoiceItem.create.mock.calls[0][0].data.total.toString()).toBe('21.1')
  })

  it('defaults omitted status to UNPAID and accepts an explicit enum value', async () => {
    await POST(
      postRequest({
        invoiceNumber: '2026-005',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: null,
            productName: 'Manual',
            quantity: 1,
            unitPrice: 4,
            discount: 0,
          },
        ],
      })
    )
    expect(mocks.invoice.create.mock.calls[0][0].data.status).toBe('UNPAID')
    expect(mocks.invoice.create.mock.calls[0][0].data.paidAt).toBeNull()

    await POST(
      postRequest({
        invoiceNumber: '2026-006',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        status: 'UNPAID',
        items: [
          {
            productId: null,
            productName: 'Manual',
            quantity: 1,
            unitPrice: 4,
            discount: 0,
          },
        ],
      })
    )
    expect(mocks.invoice.create.mock.calls[1][0].data.status).toBe('UNPAID')
  })
})
