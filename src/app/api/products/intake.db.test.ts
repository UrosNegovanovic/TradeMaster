/**
 * Real PostgreSQL regression tests for intake. Never falls back to the app DB.
 * Include in vitest.db.config.ts; its setup applies the same guard imported here.
 * Database/schema provisioning is deliberately outside this test suite.
 */
import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
// Intake persistence is real; external image downloads/storage are not part of it.
vi.mock('@/lib/persist-product-image', () => ({ scheduleProductImagePersist: vi.fn() }))

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { POST } from './route'

const prefix = `intake-db-${randomUUID()}`
const users = {
  a: { clerkUserId: `${prefix}-a`, profileId: '' },
  b: { clerkUserId: `${prefix}-b`, profileId: '' },
}

function body(sku: string, quantity = 1) {
  return { name: 'Intake regression fixture', sku, price: 12.5, quantity }
}

function request(payload: ReturnType<typeof body>, key: string | null = randomUUID()) {
  return new NextRequest('http://localhost/api/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key === null ? {} : { 'Idempotency-Key': key }) },
    body: JSON.stringify(payload),
  })
}

function rows(sku: string, profileId = users.a.profileId) {
  return prisma.product.findMany({ where: { profileId, sku } })
}

describe('product intake against a dedicated test database', () => {
  beforeAll(async () => {
    for (const user of Object.values(users)) {
      const profile = await prisma.profile.create({
        data: { clerkUserId: user.clerkUserId, companyName: prefix },
      })
      user.profileId = profile.id
    }
  })

  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(auth).mockResolvedValue({ userId: users.a.clerkUserId } as never)
  })

  afterAll(async () => {
    try {
      // Only profiles created by this run; associated fixtures cascade on delete.
      const ids = Object.values(users).map((user) => user.profileId).filter(Boolean)
      if (ids.length) await prisma.profile.deleteMany({ where: { id: { in: ids } } })
    } finally {
      await prisma.$disconnect()
    }
  })

  it('creates one daily row with quantity 2 for two concurrent first scans', async () => {
    const sku = `${prefix}-new`
    const responses = await Promise.all([POST(request(body(sku))), POST(request(body(sku)))])
    for (const response of responses) expect(response.ok).toBe(true)
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].quantity).toBe(2)
    const payloads = await Promise.all(responses.map((response) => response.json()))
    expect(new Set(payloads.map((payload) => payload.id)).size).toBe(1)
    const movements = await prisma.stockMovement.findMany({
      where: { productId: stored[0].id, source: 'INTAKE' },
    })
    expect(movements).toHaveLength(2)
    expect(movements.reduce((sum, movement) => sum + movement.quantity, 0)).toBe(2)
  })

  it('adds both concurrent scans to an existing daily row without losing quantity', async () => {
    const sku = `${prefix}-existing`
    const original = await prisma.product.create({
      data: { ...body(sku, 10), profileId: users.a.profileId },
    })
    const responses = await Promise.all([POST(request(body(sku))), POST(request(body(sku)))])
    for (const response of responses) expect(response.status).toBe(200)
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(original.id)
    expect(stored[0].quantity).toBe(12)
  })

  it('replays the exact original response after a retry, even after another intake', async () => {
    const sku = `${prefix}-retry`
    const key = randomUUID()
    const first = await POST(request(body(sku), key))
    expect(first.status).toBe(201)
    const originalPayload = await first.json()
    expect((await POST(request(body(sku)))).status).toBe(200)

    const retry = await POST(request(body(sku), key))
    expect(retry.status).toBe(first.status)
    expect(await retry.json()).toEqual(originalPayload)
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].quantity).toBe(2)
    expect(await prisma.stockMovement.count({ where: { productId: stored[0].id, source: 'INTAKE' } })).toBe(1)
  })

  it('applies simultaneous retries of one operation exactly once', async () => {
    const sku = `${prefix}-parallel-retry`
    const key = randomUUID()
    const responses = await Promise.all([
      POST(request(body(sku), key)),
      POST(request(body(sku), key)),
    ])
    for (const response of responses) expect(response.status).toBe(201)
    const payloads = await Promise.all(responses.map((response) => response.json()))
    expect(payloads[1]).toEqual(payloads[0])
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].quantity).toBe(1)
  })

  it('rejects a reused key with a different quantity without mutating stock', async () => {
    const sku = `${prefix}-conflict`
    const key = randomUUID()
    expect((await POST(request(body(sku), key))).status).toBe(201)
    expect((await POST(request(body(sku, 3), key))).status).toBe(409)
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].quantity).toBe(1)
  })

  it('scopes identical SKU and idempotency key to the authenticated tenant', async () => {
    const sku = `${prefix}-tenant`
    const key = randomUUID()
    const first = await POST(request(body(sku), key))
    expect(first.status).toBe(201)
    const firstPayload = await first.json()

    vi.mocked(auth).mockResolvedValue({ userId: users.b.clerkUserId } as never)
    const second = await POST(request(body(sku, 3), key))
    expect(second.status).toBe(201)
    const secondPayload = await second.json()
    expect(secondPayload.id).not.toBe(firstPayload.id)
    expect(secondPayload.profileId).toBe(users.b.profileId)
    const tenantA = await rows(sku, users.a.profileId)
    const tenantB = await rows(sku, users.b.profileId)
    expect(tenantA).toHaveLength(1)
    expect(tenantB).toHaveLength(1)
    expect(tenantA[0].quantity).toBe(1)
    expect(tenantB[0].quantity).toBe(3)
  })

  it.each([false, true])('rolls back stock if the receipt write fails (existing row: %s)', async (existing) => {
    const sku = `${prefix}-rollback-${existing}`
    const key = randomUUID()
    if (existing) {
      await prisma.product.create({ data: { ...body(sku, 10), profileId: users.a.profileId } })
    }
    const originalTransaction = prisma.$transaction.bind(prisma)
    let reachedReceiptWrite = false
    prisma.$transaction = (async (
      callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
      options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
    ) => originalTransaction(async (tx) => {
      tx.productIntake.create = (() => {
        reachedReceiptWrite = true
        throw new Error('forced receipt write failure')
      }) as typeof tx.productIntake.create
      return callback(tx)
    }, options)) as typeof prisma.$transaction

    try {
      expect((await POST(request(body(sku), key))).status).toBe(500)
      expect(reachedReceiptWrite).toBe(true)
    } finally {
      prisma.$transaction = originalTransaction
    }

    const stored = await rows(sku)
    expect(stored).toHaveLength(existing ? 1 : 0)
    if (existing) expect(stored[0].quantity).toBe(10)
    expect(await prisma.productIntake.findUnique({
      where: { profileId_key: { profileId: users.a.profileId, key } },
    })).toBeNull()
    // The failed operation did not reserve the key; a later retry can succeed once.
    expect((await POST(request(body(sku), key))).status).toBe(existing ? 200 : 201)
    expect((await rows(sku))[0].quantity).toBe(existing ? 11 : 1)
  })

  it('replays a receipt when its product belongs to a previous day', async () => {
    const sku = `${prefix}-previous-day`
    const key = randomUUID()
    const first = await POST(request(body(sku), key))
    expect(first.status).toBe(201)
    const originalPayload = await first.json()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(12, 0, 0, 0)
    await prisma.product.update({ where: { id: originalPayload.id }, data: { createdAt: yesterday } })

    const retry = await POST(request(body(sku), key))
    expect(retry.status).toBe(201)
    expect(await retry.json()).toEqual(originalPayload)
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].quantity).toBe(1)
    expect(stored[0].createdAt).toEqual(yesterday)
  })

  it('keeps both concurrent legacy intakes without an idempotency header', async () => {
    const sku = `${prefix}-legacy`
    const responses = await Promise.all([
      POST(request(body(sku), null)), POST(request(body(sku), null)),
    ])
    for (const response of responses) expect(response.ok).toBe(true)
    const stored = await rows(sku)
    expect(stored).toHaveLength(1)
    expect(stored[0].quantity).toBe(2)
  })

  it('rejects an invalid idempotency key before creating a product', async () => {
    const sku = `${prefix}-invalid-key`
    expect((await POST(request(body(sku), 'invalid!'))).status).toBe(400)
    expect(await rows(sku)).toHaveLength(0)
  })
})
