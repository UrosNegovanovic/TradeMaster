import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { consumeRateLimit, rateLimitKey, rateLimits, resetRateLimitStore } from '@/lib/rate-limit'

const mocks = vi.hoisted(() => ({
  catalog: { findFirst: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { GET } from './route'

const token = 'a'.repeat(64)

describe('GET /api/shared/catalog/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitStore()
  })

  it('allows an anonymous buyer to read an enabled shared catalog', async () => {
    mocks.catalog.findFirst.mockResolvedValue({
      name: 'Ponuda za kupca',
      clientName: 'Kupac',
      notes: null,
      discount: '5',
      profile: {
        companyName: 'Firma',
        contactEmail: 'prodaja@example.com',
        contactPhone: null,
        address: null,
        logoUrl: null,
      },
      items: [],
    })

    const response = await GET(
      new NextRequest(`http://localhost/api/shared/catalog/${token}`),
      { params: { token } }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      name: 'Ponuda za kupca',
      profile: { companyName: 'Firma' },
    })
    expect(mocks.catalog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shareToken: token, shareEnabled: true } })
    )
  })

  it('does not accept a catalog id as a public token', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/shared/catalog/catalog-id'),
      { params: { token: 'catalog-id' } }
    )

    expect(response.status).toBe(404)
    expect(mocks.catalog.findFirst).not.toHaveBeenCalled()
  })

  it('returns 429 after the token catalog quota is exceeded', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.41' }
    const request = new NextRequest(`http://localhost/api/shared/catalog/${token}`, { headers })
    const key = rateLimitKey(rateLimits.sharedCatalog.name, request)
    for (let i = 0; i < rateLimits.sharedCatalog.limit; i += 1) {
      consumeRateLimit(key, rateLimits.sharedCatalog.limit, rateLimits.sharedCatalog.windowMs)
    }

    const blocked = await GET(request, { params: { token } })
    expect(blocked.status).toBe(429)
    await expect(blocked.json()).resolves.toEqual({ error: 'Too many requests' })
    expect(mocks.catalog.findFirst).not.toHaveBeenCalled()
  })
})
