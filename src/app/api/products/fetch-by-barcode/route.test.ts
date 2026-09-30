import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  consumeRateLimit,
  rateLimitKey,
  rateLimits,
  resetRateLimitStore,
} from '@/lib/rate-limit'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    product: { findFirst: vi.fn() },
  },
}))

import { GET } from './route'

describe('GET /api/products/fetch-by-barcode', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('returns 429 after the barcode lookup quota is exceeded', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.42' }
    const request = new NextRequest('http://localhost/api/products/fetch-by-barcode?barcode=12345678', {
      headers,
    })
    const key = rateLimitKey(rateLimits.barcodeLookup.name, request)
    for (let i = 0; i < rateLimits.barcodeLookup.limit; i += 1) {
      consumeRateLimit(key, rateLimits.barcodeLookup.limit, rateLimits.barcodeLookup.windowMs)
    }

    const blocked = await GET(request)
    expect(blocked.status).toBe(429)
    await expect(blocked.json()).resolves.toEqual({ error: 'Too many requests' })
  })
})
