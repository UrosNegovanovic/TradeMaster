import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  catalog: { findUnique: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { GET } from './route'

function getRequest(id: string) {
  return new NextRequest(`http://localhost/api/public/catalogs/${id}`)
}

describe('GET /api/public/catalogs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 JSON when the catalog does not exist', async () => {
    mocks.catalog.findUnique.mockResolvedValue(null)
    const response = await GET(getRequest('missing'), { params: { id: 'missing' } })
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Catalog not found' })
  })

  it('returns a public DTO without tenant internals', async () => {
    mocks.catalog.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'Ponuda',
      clientName: 'Kupac',
      discount: 5,
      notes: null,
      profileId: 'secret-profile',
      profile: {
        companyName: 'Firma',
        contactEmail: 'a@b.com',
        contactPhone: null,
        address: null,
        logoUrl: null,
        clerkUserId: 'should-not-be-selected',
      },
      items: [
        {
          id: 'item-1',
          originalPrice: 100,
          discountedPrice: 95,
          sortOrder: 0,
          product: {
            name: 'Sok',
            sku: '123',
            imageUrl: null,
            description: null,
            quantity: 99,
          },
        },
      ],
    })

    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.profile.companyName).toBe('Firma')
    expect(body.items[0].product.sku).toBe('123')
    expect(body).not.toHaveProperty('profileId')
    expect(body.profile).not.toHaveProperty('clerkUserId')
    expect(body.items[0].product).not.toHaveProperty('quantity')
  })
})
