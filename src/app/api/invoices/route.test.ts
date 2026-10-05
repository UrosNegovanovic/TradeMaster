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
    $executeRaw: vi.fn(),
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
import { InvoiceClientError } from '@/lib/invoice-service'
import { POST } from './route'

const profile = {
  id: 'profile-a',
  clerkUserId: 'user-a',
  pib: '123456789',
}

const ownedProduct = {
  id: 'product-a',
  costPrice: '6.25',
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
    stockMocks.syncInvoiceStock.mockResolvedValue(undefined)
    prismaTransactionReset()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.product.findMany.mockResolvedValue([ownedProduct])
    mocks.invoice.findMany.mockResolvedValue([])
    mocks.$executeRaw.mockResolvedValue(1)
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

  it('blocks invoice creation when the company PIB is missing', async () => {
    mocks.profile.findUnique.mockResolvedValue({ ...profile, pib: null })

    const response = await POST(
      postRequest({
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [{ productId: 'product-a', productName: 'Coffee', quantity: 1, unitPrice: 10, discount: 0 }],
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Unesite važeći PIB firme od 9 cifara pre izdavanja fakture.',
    })
    expect(mocks.invoice.create).not.toHaveBeenCalled()
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
    expect(mocks.invoice.create.mock.calls[0][0].data.invoiceNumber).toBe('01/2026')
    expect(mocks.invoice.create.mock.calls[0][0].data.invoiceNumber).not.toBe('03/2026')
    expect(mocks.invoice.create.mock.calls[0][0].data.clientPib).toBeNull()
    expect(mocks.$executeRaw).toHaveBeenCalledTimes(1)
    expect(mocks.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['product-a'] }, profileId: profile.id },
      select: { id: true, costPrice: true },
    })
    expect(mocks.invoiceItem.create).toHaveBeenCalledTimes(3)
    expect(mocks.invoiceItem.create.mock.calls[0][0].data).toMatchObject({
      quantity: 1,
      productName: 'Coffee',
    })
    expect(mocks.invoiceItem.create.mock.calls[0][0].data.unitPrice.toString()).toBe('10')
    expect(mocks.invoiceItem.create.mock.calls[0][0].data.unitCost.toString()).toBe('6.25')
    expect(mocks.invoiceItem.create.mock.calls[1][0].data.unitCost.toString()).toBe('6.25')
    expect(mocks.invoiceItem.create.mock.calls[2][0].data.unitCost).toBeNull()
    expect(stockMocks.syncInvoiceStock).toHaveBeenCalledTimes(1)
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

  it('persists buyer PIB on create', async () => {
    const response = await POST(
      postRequest({
        dueDate: '2026-10-01',
        clientName: 'Acme',
        clientPib: '123456789',
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
    expect(response.status).toBe(201)
    expect(mocks.invoice.create.mock.calls[0][0].data.clientPib).toBe('123456789')
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

  it('returns JSON 400 when stock sync reports insufficient stock', async () => {
    stockMocks.syncInvoiceStock.mockRejectedValue(
      new InvoiceClientError('Nema dovoljno na stanju za „Coffee“. Traženo: 8 kom, na stanju: 1 kom.', 400)
    )
    const response = await POST(
      postRequest({
        invoiceNumber: '2026-007',
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: 'product-a',
            productName: 'Coffee',
            quantity: 8,
            unitPrice: 10,
            discount: 0,
          },
        ],
      })
    )
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({
      error: 'Nema dovoljno na stanju za „Coffee“. Traženo: 8 kom, na stanju: 1 kom.',
    })
  })

  it('returns JSON 500 when stock sync throws an unexpected error', async () => {
    stockMocks.syncInvoiceStock.mockRejectedValue(new Error('advisory lock exploded'))
    const response = await POST(
      postRequest({
        invoiceNumber: '2026-008',
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
        ],
      })
    )
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })
  describe('PDV', () => {
    const vatBody = {
      dueDate: '2026-10-01',
      clientName: 'Acme',
      items: [
        { productId: 'product-a', productName: 'Coffee', quantity: 3, unitPrice: 33.33, discount: 0, vatRate: 20 },
        { productId: 'product-a', productName: 'Bread', quantity: 1, unitPrice: 10, discount: 0, vatRate: 10 },
      ],
    }

    it('stores the rate per line, vatAmount and a gross totalAmount for a company in the PDV system', async () => {
      mocks.profile.findUnique.mockResolvedValue({ ...profile, inVatSystem: true })
      mocks.product.findMany.mockResolvedValue([ownedProduct])

      const response = await POST(postRequest(vatBody))

      expect(response.status).toBe(201)
      // 20%: base 99.99 -> 20.00 (19.998); 10%: base 10.00 -> 1.00
      const invoiceData = mocks.invoice.create.mock.calls[0][0].data
      expect(invoiceData.vatEnabled).toBe(true)
      expect(String(invoiceData.vatAmount)).toBe('21')
      expect(String(invoiceData.totalAmount)).toBe('130.99')
      expect(mocks.invoiceItem.create.mock.calls.map(([call]) => String(call.data.vatRate))).toEqual(['20', '10'])
    })

    it('forces vatRate 0 and no PDV when the company is not in the PDV system', async () => {
      mocks.profile.findUnique.mockResolvedValue({ ...profile, inVatSystem: false })

      const response = await POST(postRequest(vatBody))

      expect(response.status).toBe(201)
      const invoiceData = mocks.invoice.create.mock.calls[0][0].data
      expect(invoiceData.vatEnabled).toBe(false)
      expect(String(invoiceData.vatAmount)).toBe('0')
      expect(String(invoiceData.totalAmount)).toBe('109.99')
      expect(mocks.invoiceItem.create.mock.calls.every(([call]) => String(call.data.vatRate) === '0')).toBe(true)
    })

    it('rejects a rate that is not 0, 10 or 20', async () => {
      mocks.profile.findUnique.mockResolvedValue({ ...profile, inVatSystem: true })
      const response = await POST(
        postRequest({ ...vatBody, items: [{ ...vatBody.items[0], vatRate: 18 }] })
      )
      expect(response.status).toBe(400)
      expect(mocks.invoice.create).not.toHaveBeenCalled()
    })
  })

  describe('proforma (predračun)', () => {
    const proformaBody = {
      documentType: 'PROFORMA',
      dueDate: '2026-11-01',
      clientName: 'Acme',
      items: [{ productId: 'product-a', productName: 'Coffee', quantity: 500, unitPrice: 10, discount: 0 }],
    }

    it('numbers it in the PR- series and takes no stock', async () => {
      mocks.invoice.findMany.mockResolvedValue([{ invoiceNumber: 'PR-03/2026' }])
      const response = await POST(postRequest(proformaBody))
      expect(response.status).toBe(201)

      expect(mocks.invoice.findMany.mock.calls[0][0].where.documentType).toBe('PROFORMA')
      const data = mocks.invoice.create.mock.calls[0][0].data
      expect(data.documentType).toBe('PROFORMA')
      expect(data.invoiceNumber).toMatch(/^PR-04\/\d{4}$/)
      expect(stockMocks.syncInvoiceStock.mock.calls[0][1].status).toBe('DRAFT')
    })

    it('cannot be created as paid', async () => {
      const response = await POST(postRequest({ ...proformaBody, status: 'PAID' }))
      expect(response.status).toBe(409)
      expect(mocks.invoice.create).not.toHaveBeenCalled()
    })

    it('defaults to an invoice when documentType is missing', async () => {
      const response = await POST(postRequest({ ...proformaBody, documentType: undefined, items: [{ ...proformaBody.items[0], quantity: 1 }] }))
      expect(response.status).toBe(201)
      expect(mocks.invoice.create.mock.calls[0][0].data.documentType).toBe('INVOICE')
      expect(stockMocks.syncInvoiceStock.mock.calls[0][1].status).toBe('UNPAID')
    })
  })
})
