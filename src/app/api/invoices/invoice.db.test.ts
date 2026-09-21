/**
 * Real PostgreSQL tests. These are not a substitute for RLS checks:
 * Prisma uses a privileged application connection and bypasses RLS.
 *
 * Requires TEST_DATABASE_URL for a dedicated local/test database.
 * There is no fallback to the application DATABASE_URL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
import { POST } from './route'
import { PUT } from './[id]/route'
import { prisma } from '@/lib/prisma'

const testPrefix = `invoice-db-${Date.now()}`

const users = {
  a: { clerkUserId: `${testPrefix}-user-a`, profileId: '', productId: '' },
  b: { clerkUserId: `${testPrefix}-user-b`, profileId: '', productId: '' },
}

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/invoices', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function putRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/invoices/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('invoice handlers against a real test database', () => {
  beforeAll(async () => {
    const profileA = await prisma.profile.create({
      data: { clerkUserId: users.a.clerkUserId, companyName: `${testPrefix} A` },
    })
    const profileB = await prisma.profile.create({
      data: { clerkUserId: users.b.clerkUserId, companyName: `${testPrefix} B` },
    })
    users.a.profileId = profileA.id
    users.b.profileId = profileB.id

    const productA = await prisma.product.create({
      data: {
        name: `${testPrefix} Coffee`,
        sku: `${testPrefix}-sku-a`,
        price: 10,
        quantity: 5,
        profileId: profileA.id,
      },
    })
    const productB = await prisma.product.create({
      data: {
        name: `${testPrefix} Tea`,
        sku: `${testPrefix}-sku-b`,
        price: 8,
        quantity: 5,
        profileId: profileB.id,
      },
    })
    users.a.productId = productA.id
    users.b.productId = productB.id
  })

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: users.a.clerkUserId } as never)
  })

  afterAll(async () => {
    await prisma.invoice.deleteMany({
      where: { profileId: { in: [users.a.profileId, users.b.profileId] } },
    })
    await prisma.product.deleteMany({
      where: { id: { in: [users.a.productId, users.b.productId] } },
    })
    await prisma.profile.deleteMany({
      where: { id: { in: [users.a.profileId, users.b.profileId] } },
    })
    await prisma.$disconnect()
  })

  it('persists calculated decimal totals for an owned product', async () => {
    const response = await POST(
      postRequest({
        invoiceNumber: `${testPrefix}-001`,
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: users.a.productId,
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 10.555,
            discount: 0,
          },
        ],
      })
    )
    expect(response.status).toBe(400)

    const created = await POST(
      postRequest({
        invoiceNumber: `${testPrefix}-001`,
        dueDate: '2026-10-01',
        clientName: 'Acme',
        totalAmount: 1,
        items: [
          {
            productId: users.a.productId,
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 10.55,
            discount: 0,
            total: 1,
          },
        ],
      })
    )

    expect(created.status).toBe(201)
    const payload = await created.json()
    const stored = await prisma.invoice.findUnique({
      where: { id: payload.id },
      include: { items: true },
    })

    expect(stored?.totalAmount.toString()).toBe('21.1')
    expect(stored?.items).toHaveLength(1)
    expect(stored?.items[0].total.toString()).toBe('21.1')
    expect(stored?.items[0].unitPrice.toString()).toBe('10.55')
    expect(stored?.status).toBe('UNPAID')
  })

  it('isolates owners through the application handlers', async () => {
    const response = await POST(
      postRequest({
        invoiceNumber: `${testPrefix}-002`,
        dueDate: '2026-10-01',
        clientName: 'Acme',
        items: [
          {
            productId: users.b.productId,
            productName: 'Tea',
            quantity: 1,
            unitPrice: 8,
            discount: 0,
          },
        ],
      })
    )

    expect(response.status).toBe(400)
    const leftover = await prisma.invoice.findFirst({
      where: { invoiceNumber: `${testPrefix}-002` },
    })
    expect(leftover).toBeNull()
  })

  it('rolls back PUT item replacement when a later write fails', async () => {
    const created = await POST(
      postRequest({
        invoiceNumber: `${testPrefix}-003`,
        dueDate: '2026-10-01',
        clientName: 'Acme',
        status: 'UNPAID',
        items: [
          {
            productId: users.a.productId,
            productName: 'Coffee',
            quantity: 1,
            unitPrice: 12.3,
            discount: 0,
          },
        ],
      })
    )
    expect(created.status).toBe(201)
    const invoice = await created.json()

    const originalItems = await prisma.invoiceItem.findMany({
      where: { invoiceId: invoice.id },
    })

    const originalTransaction = prisma.$transaction.bind(prisma)
    prisma.$transaction = (async (fn: (tx: any) => Promise<unknown>) =>
      originalTransaction(async (tx) => {
        const originalDeleteMany = tx.invoiceItem.deleteMany.bind(tx.invoiceItem)
        tx.invoiceItem.deleteMany = (async (args: any) => {
          await originalDeleteMany(args)
          throw new Error('forced failure after first write')
        }) as any
        return fn(tx)
      })) as unknown as typeof prisma.$transaction

    try {
      const failedPut = await PUT(
        putRequest(invoice.id, {
          invoiceNumber: `${testPrefix}-003-updated`,
          dueDate: '2026-12-01',
          clientName: 'Changed',
          status: 'DRAFT',
          items: [
            {
              productId: users.a.productId,
              productName: 'Should not persist',
              quantity: 1,
              unitPrice: 4,
              discount: 0,
            },
          ],
        }),
        { params: Promise.resolve({ id: invoice.id }) }
      )

      expect(failedPut.status).toBeGreaterThanOrEqual(400)

      const untouched = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true },
      })

      expect(untouched?.invoiceNumber).toBe(`${testPrefix}-003`)
      expect(untouched?.clientName).toBe('Acme')
      expect(untouched?.status).toBe('UNPAID')
      expect(untouched?.items).toHaveLength(1)
      expect(untouched?.items[0].id).toBe(originalItems[0].id)
      expect(untouched?.items[0].unitPrice.toString()).toBe('12.3')
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it('keeps PUT from writing status when the client sends DRAFT', async () => {
    const created = await POST(
      postRequest({
        invoiceNumber: `${testPrefix}-004`,
        dueDate: '2026-10-01',
        clientName: 'Acme',
        status: 'UNPAID',
        items: [
          {
            productId: users.a.productId,
            productName: 'Coffee',
            quantity: 1,
            unitPrice: 5,
            discount: 0,
          },
        ],
      })
    )
    const invoice = await created.json()

    const updated = await PUT(
      putRequest(invoice.id, {
        invoiceNumber: `${testPrefix}-004`,
        dueDate: '2026-10-15',
        clientName: 'Acme Updated',
        status: 'DRAFT',
        items: [
          {
            productId: users.a.productId,
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 5,
            discount: 0,
          },
        ],
      }),
      { params: Promise.resolve({ id: invoice.id }) }
    )

    expect(updated.status).toBe(200)
    const stored = await prisma.invoice.findUnique({ where: { id: invoice.id } })
    expect(stored?.status).toBe('UNPAID')
    expect(stored?.clientName).toBe('Acme Updated')
    expect(stored?.totalAmount.toString()).toBe('10')
  })

  it('keeps concurrent PUT replacements as one complete set, not mixed items', async () => {
    const created = await POST(
      postRequest({
        invoiceNumber: `${testPrefix}-006`,
        dueDate: '2026-10-01',
        clientName: 'Original',
        status: 'UNPAID',
        items: [
          {
            productId: users.a.productId,
            productName: 'Coffee',
            quantity: 1,
            unitPrice: 5,
            discount: 0,
          },
        ],
      })
    )
    const invoice = await created.json()

    const [first, second] = await Promise.all([
      PUT(
        putRequest(invoice.id, {
          invoiceNumber: `${testPrefix}-006`,
          dueDate: '2026-10-01',
          clientName: 'WriterA',
          items: [
            {
              productId: users.a.productId,
              productName: 'Coffee A',
              quantity: 1,
              unitPrice: 7,
              discount: 0,
            },
          ],
        }),
        { params: Promise.resolve({ id: invoice.id }) }
      ),
      PUT(
        putRequest(invoice.id, {
          invoiceNumber: `${testPrefix}-006`,
          dueDate: '2026-10-01',
          clientName: 'WriterB',
          items: [
            {
              productId: users.a.productId,
              productName: 'Coffee B',
              quantity: 3,
              unitPrice: 9,
              discount: 0,
            },
          ],
        }),
        { params: Promise.resolve({ id: invoice.id }) }
      ),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const stored = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    })

    const writerA =
      stored?.clientName === 'WriterA' &&
      stored.items.length === 1 &&
      stored.items[0].quantity === 1 &&
      stored.items[0].unitPrice.toString() === '7' &&
      stored.totalAmount.toString() === '7'
    const writerB =
      stored?.clientName === 'WriterB' &&
      stored.items.length === 1 &&
      stored.items[0].quantity === 3 &&
      stored.items[0].unitPrice.toString() === '9' &&
      stored.totalAmount.toString() === '27'

    expect(writerA || writerB).toBe(true)
    expect(stored?.status).toBe('UNPAID')
  })

  it('rolls back when an error is thrown after the first write in a transaction', async () => {
    const isolated = new PrismaClient()
    const invoiceNumber = `${testPrefix}-005`

    await expect(
      isolated.$transaction(async (tx) => {
        await tx.invoice.create({
          data: {
            invoiceNumber,
            dueDate: new Date('2026-10-01'),
            clientName: 'Acme',
            status: 'DRAFT',
            totalAmount: 5,
            profileId: users.a.profileId,
          },
        })
        throw new Error('forced failure after first write')
      })
    ).rejects.toThrow('forced failure after first write')

    const leftover = await prisma.invoice.findFirst({
      where: { invoiceNumber },
    })
    expect(leftover).toBeNull()
    await isolated.$disconnect()
  })
})
