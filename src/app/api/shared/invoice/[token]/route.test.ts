import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { consumeRateLimit, rateLimitKey, rateLimits, resetRateLimitStore } from '@/lib/rate-limit'

const mocks = vi.hoisted(() => ({
  invoice: { findFirst: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { GET } from './route'

const token = 'c'.repeat(64)

function read(value: string, headers?: Record<string, string>) {
  return GET(new NextRequest(`http://localhost/api/shared/invoice/${value}`, { headers }), { params: { token: value } })
}

describe('GET /api/shared/invoice/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitStore()
  })

  it('returns an enabled, issued invoice without private fields', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ invoiceNumber: '2026-001', clientName: 'Kupac', items: [] })

    const response = await read(token)

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    await expect(response.json()).resolves.toMatchObject({ invoiceNumber: '2026-001' })
    const query = mocks.invoice.findFirst.mock.calls[0][0]
    expect(query.where).toEqual({ shareToken: token, shareEnabled: true, status: { in: ['UNPAID', 'PAID'] } })
    expect(query.select.items.select).not.toHaveProperty('unitCost')
    expect(query.select).not.toHaveProperty('profileId')
  })

  it('returns 404 for a revoked, draft or unknown link', async () => {
    mocks.invoice.findFirst.mockResolvedValue(null)
    expect((await read(token)).status).toBe(404)
  })

  it('does not accept an invoice id as a token', async () => {
    const response = await read('cmabc123invoiceid')
    expect(response.status).toBe(404)
    expect(mocks.invoice.findFirst).not.toHaveBeenCalled()
  })

  it('returns 429 after the quota is exceeded', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.42' }
    const key = rateLimitKey(rateLimits.sharedInvoice.name, new NextRequest(`http://localhost/api/shared/invoice/${token}`, { headers }))
    for (let i = 0; i < rateLimits.sharedInvoice.limit; i += 1) {
      consumeRateLimit(key, rateLimits.sharedInvoice.limit, rateLimits.sharedInvoice.windowMs)
    }
    expect((await read(token, headers)).status).toBe(429)
    expect(mocks.invoice.findFirst).not.toHaveBeenCalled()
  })
})
