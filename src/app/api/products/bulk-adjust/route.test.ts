import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { MovementType, StockMovementSource } from '@prisma/client'
import { BULK_ADJUST_REASON, SKU_AMBIGUOUS_ERROR, SKU_MISSING_ERROR } from '@/lib/stock-adjust'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const prisma = {
    profile: { findUnique: vi.fn() },
    product: { findMany: vi.fn(), update: vi.fn() },
    stockMovement: { create: vi.fn() },
    $executeRaw: vi.fn(),
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

const profile = { id: 'profile-a', clerkUserId: 'user-a' }

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/products/bulk-adjust', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/products/bulk-adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.$executeRaw.mockResolvedValue(1)
    mocks.product.update.mockResolvedValue({})
    mocks.stockMovement.create.mockResolvedValue({})
  })

  it('returns 401 for guests', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const response = await POST(postRequest({ sku: '86001', quantity: 4 }))
    expect(response.status).toBe(401)
    expect(mocks.product.findMany).not.toHaveBeenCalled()
  })

  it('skips a missing SKU without creating a product', async () => {
    mocks.product.findMany.mockResolvedValue([])
    const response = await POST(postRequest({ sku: 'nepostoji', quantity: 4 }))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ ok: false, error: SKU_MISSING_ERROR })
    expect(mocks.product.update).not.toHaveBeenCalled()
    expect(mocks.stockMovement.create).not.toHaveBeenCalled()
  })

  it('skips an ambiguous daily-batched SKU without guessing', async () => {
    mocks.product.findMany.mockResolvedValue([
      { id: 'p1', quantity: 3 },
      { id: 'p2', quantity: 5 },
    ])
    const response = await POST(postRequest({ sku: '86001', quantity: 10 }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ ok: false, error: SKU_AMBIGUOUS_ERROR })
    expect(mocks.product.update).not.toHaveBeenCalled()
    expect(mocks.stockMovement.create).not.toHaveBeenCalled()
  })

  it('sets quantity higher with a MANUAL IN movement', async () => {
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', quantity: 4 }])
    const response = await POST(postRequest({ sku: '86001', quantity: 10 }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      ok: true,
      sku: '86001',
      previousQuantity: 4,
      quantity: 10,
      delta: 6,
      type: MovementType.IN,
    })
    expect(mocks.product.update).toHaveBeenCalledWith({
      where: { id: 'product-a' },
      data: { quantity: 10 },
    })
    expect(mocks.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MovementType.IN,
        quantity: 6,
        reason: BULK_ADJUST_REASON,
        source: StockMovementSource.MANUAL,
        productId: 'product-a',
        profileId: 'profile-a',
      }),
    })
  })

  it('sets quantity lower with a MANUAL OUT movement', async () => {
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', quantity: 10 }])
    const response = await POST(postRequest({ sku: '86001', quantity: 3 }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ delta: -7, type: MovementType.OUT })
    expect(mocks.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MovementType.OUT,
        quantity: 7,
        source: StockMovementSource.MANUAL,
      }),
    })
  })

  it('does not write a movement when the SET quantity matches current stock', async () => {
    mocks.product.findMany.mockResolvedValue([{ id: 'product-a', quantity: 4 }])
    const response = await POST(postRequest({ sku: '86001', quantity: 4 }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ delta: 0, type: null })
    expect(mocks.product.update).not.toHaveBeenCalled()
    expect(mocks.stockMovement.create).not.toHaveBeenCalled()
  })
})
