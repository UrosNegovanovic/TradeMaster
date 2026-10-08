import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { consumeRateLimit, rateLimitKey, rateLimits, resetRateLimitStore } from '@/lib/rate-limit'

const mocks = vi.hoisted(() => ({
  catalog: { findUnique: vi.fn(), updateMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { GET } from './route'

function getRequest(id: string) {
  return new NextRequest(`http://localhost/api/public/catalogs/${id}`)
}

const sharedCatalog = {
  id: 'cat-1',
  name: 'Ponuda',
  clientName: 'Kupac',
  discount: 5,
  notes: null,
  shareEnabled: true,
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
        costPrice: 12,
      },
    },
  ],
}

describe('GET /api/public/catalogs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitStore()
  })

  it('returns 404 JSON when the catalog does not exist', async () => {
    mocks.catalog.findUnique.mockResolvedValue(null)
    const response = await GET(getRequest('missing'), { params: { id: 'missing' } })
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Catalog not found' })
  })

  it('returns 410 when share is disabled so a CUID is not an access secret', async () => {
    mocks.catalog.findUnique.mockResolvedValue({ ...sharedCatalog, shareEnabled: false })
    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({ error: 'Catalog not found' })
  })

  it('returns a public DTO without tenant internals or cost price when share is enabled', async () => {
    mocks.catalog.findUnique.mockResolvedValue(sharedCatalog)

    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.profile.companyName).toBe('Firma')
    expect(body.items[0].product.sku).toBe('123')
    expect(body).not.toHaveProperty('profileId')
    expect(body).not.toHaveProperty('shareEnabled')
    expect(body.profile).not.toHaveProperty('clerkUserId')
    expect(body.items[0].product).not.toHaveProperty('quantity')
    expect(body.items[0].product).not.toHaveProperty('costPrice')
    expect(JSON.stringify(body)).not.toMatch(/costPrice|nabav/i)
  })

  it('returns 429 after the guest catalog quota is exceeded', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.40' }
    const request = new NextRequest('http://localhost/api/public/catalogs/cat-1', { headers })
    const key = rateLimitKey(rateLimits.publicCatalog.name, request)
    for (let i = 0; i < rateLimits.publicCatalog.limit; i += 1) {
      consumeRateLimit(key, rateLimits.publicCatalog.limit, rateLimits.publicCatalog.windowMs)
    }

    const blocked = await GET(request, { params: { id: 'cat-1' } })
    expect(blocked.status).toBe(429)
    await expect(blocked.json()).resolves.toEqual({ error: 'Too many requests' })
    expect(blocked.headers.get('Retry-After')).toMatch(/^\d+$/)
    expect(mocks.catalog.findUnique).not.toHaveBeenCalled()
  })

  it('counts an open only when sharing is enabled', async () => {
    mocks.catalog.findUnique.mockResolvedValue(sharedCatalog)
    expect((await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })).status).toBe(200)
    expect(mocks.catalog.updateMany).toHaveBeenCalledWith({
      where: { id: 'cat-1', shareEnabled: true },
      data: { shareViewCount: { increment: 1 }, shareLastViewedAt: expect.any(Date) },
    })

    mocks.catalog.updateMany.mockClear()
    mocks.catalog.findUnique.mockResolvedValue({ ...sharedCatalog, shareEnabled: false })
    expect((await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })).status).toBe(410)
    expect(mocks.catalog.updateMany).not.toHaveBeenCalled()
  })
})
