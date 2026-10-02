import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => {
  const tx = {
    catalog: { update: vi.fn() },
    catalogItem: { deleteMany: vi.fn(), create: vi.fn() },
  }
  return {
    tx,
    profile: { findUnique: vi.fn() },
    catalog: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { GET, PATCH } from './route'

function getRequest(id: string) {
  return new NextRequest(`http://localhost/api/catalogs/${id}`)
}

describe('GET /api/catalogs/[id] (owner API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for guests instead of leaking catalog JSON', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(401)
    expect(mocks.catalog.findUnique).not.toHaveBeenCalled()
  })

  it('returns 403 when another company is signed in', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-b' } as never)
    mocks.profile.findUnique.mockResolvedValue({ id: 'profile-b', clerkUserId: 'user-b' })
    mocks.catalog.findUnique.mockResolvedValue({
      id: 'cat-1',
      profileId: 'profile-a',
      profile: { companyName: 'A' },
      items: [],
    })
    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(403)
  })
})

describe('PATCH /api/catalogs/[id] (owner API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue({ id: 'profile-a', clerkUserId: 'user-a' })
    mocks.catalog.findUnique.mockResolvedValue({ id: 'cat-1', profileId: 'profile-a', items: [] })
    mocks.tx.catalog.update.mockResolvedValue({ id: 'cat-1' })
  })

  function patchRequest(body: unknown) {
    return new NextRequest('http://localhost/api/catalogs/cat-1', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  it('saves display settings and keeps the order the user picked', async () => {
    // Database returns products in a different order than the user selected
    mocks.product.findMany.mockResolvedValue([
      { id: 'p-a', price: '100.00' },
      { id: 'p-b', price: '0.00' },
      { id: 'p-c', price: '50.00' },
    ])

    const response = await PATCH(
      patchRequest({
        name: 'Cenovnik',
        discount: 10,
        productIds: ['p-c', 'p-a', 'p-b'],
        layout: 'LIST',
        groupByCategory: true,
        sortMode: 'MANUAL',
        showSku: false,
        showDescription: true,
        showOriginalPrice: false,
      }),
      { params: { id: 'cat-1' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.tx.catalog.update.mock.calls[0][0].data).toMatchObject({
      layout: 'LIST',
      groupByCategory: true,
      sortMode: 'MANUAL',
      showSku: false,
      showDescription: true,
      showOriginalPrice: false,
    })
    const created = mocks.tx.catalogItem.create.mock.calls.map(([arg]) => arg.data)
    expect(created.map((d) => [d.productId, d.sortOrder])).toEqual([
      ['p-c', 0],
      ['p-a', 1],
      ['p-b', 2],
    ])
  })

  it('rejects an unknown layout', async () => {
    const response = await PATCH(
      patchRequest({ name: 'X', discount: 0, productIds: ['p-a'], layout: 'POSTER' }),
      { params: { id: 'cat-1' } }
    )
    expect(response.status).toBe(400)
    expect(mocks.$transaction).not.toHaveBeenCalled()
  })

  it('defaults display settings for older clients that do not send them', async () => {
    mocks.product.findMany.mockResolvedValue([{ id: 'p-a', price: '100.00' }])
    const response = await PATCH(
      patchRequest({ name: 'X', discount: 0, productIds: ['p-a'] }),
      { params: { id: 'cat-1' } }
    )
    expect(response.status).toBe(200)
    expect(mocks.tx.catalog.update.mock.calls[0][0].data).toMatchObject({
      layout: 'GRID_4',
      groupByCategory: false,
      sortMode: 'MANUAL',
      showSku: true,
      showDescription: true,
      showOriginalPrice: true,
    })
  })
})
