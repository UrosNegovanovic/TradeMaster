import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { MovementType } from '@prisma/client'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const prisma = {
    profile: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), update: vi.fn() },
    stockMovement: { create: vi.fn() },
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
const product = {
  id: 'product-a',
  profileId: 'profile-a',
  quantity: 10,
  name: 'Sok',
  costPrice: 8,
}

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/stock-movements', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/stock-movements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.$transaction.mockImplementation(async (fn: (tx: typeof mocks) => unknown) => fn(mocks))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.product.findUnique.mockResolvedValue(product)
    mocks.stockMovement.create.mockResolvedValue({
      id: 'move-1',
      type: MovementType.IN,
      quantity: 2,
      product: { id: 'product-a', name: 'Sok', sku: '86001' },
    })
    mocks.product.update.mockResolvedValue(product)
  })

  it('updates costPrice in the same transaction when stock-in includes it', async () => {
    const response = await POST(
      postRequest({
        productId: 'product-a',
        type: MovementType.IN,
        quantity: 2,
        reason: 'Nabavka',
        costPrice: 18.5,
      })
    )
    expect(response.status).toBe(201)
    expect(mocks.product.update).toHaveBeenCalledWith({
      where: { id: 'product-a' },
      data: { quantity: 12, costPrice: 18.5, costPriceZeroReason: null },
    })
    expect(mocks.stockMovement.create).toHaveBeenCalled()
  })

  it('leaves costPrice unchanged when stock-in omits it', async () => {
    const response = await POST(
      postRequest({
        productId: 'product-a',
        type: MovementType.IN,
        quantity: 2,
        reason: 'Nabavka',
      })
    )
    expect(response.status).toBe(201)
    expect(mocks.product.update).toHaveBeenCalledWith({
      where: { id: 'product-a' },
      data: { quantity: 12 },
    })
  })

  it('rejects stock-in costPrice 0 without a zero-reason', async () => {
    const response = await POST(
      postRequest({
        productId: 'product-a',
        type: MovementType.IN,
        quantity: 2,
        reason: 'Nabavka',
        costPrice: 0,
      })
    )
    expect(response.status).toBe(400)
    expect(mocks.product.update).not.toHaveBeenCalled()
  })

  it('does not write costPrice on stock-out even if a client sends one', async () => {
    mocks.stockMovement.create.mockResolvedValue({
      id: 'move-2',
      type: MovementType.OUT,
      quantity: 2,
      product: { id: 'product-a', name: 'Sok', sku: '86001' },
    })
    const response = await POST(
      postRequest({
        productId: 'product-a',
        type: MovementType.OUT,
        quantity: 2,
        reason: 'Korekcija',
        costPrice: 1,
      })
    )
    expect(response.status).toBe(201)
    expect(mocks.product.update).toHaveBeenCalledWith({
      where: { id: 'product-a' },
      data: { quantity: 8 },
    })
  })
})
