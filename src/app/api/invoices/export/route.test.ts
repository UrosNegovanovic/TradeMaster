import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  invoice: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

const get = (query: string) => GET(new NextRequest(`http://localhost/api/invoices/export?${query}`))

describe('GET /api/invoices/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue({ id: 'profile-a' })
    mocks.invoice.findMany.mockResolvedValue([])
  })

  it('requires authentication', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await get('from=2026-10-01&to=2026-10-31')).status).toBe(401)
    expect(mocks.invoice.findMany).not.toHaveBeenCalled()
  })

  it('returns 404 until the profile exists', async () => {
    mocks.profile.findUnique.mockResolvedValue(null)
    expect((await get('from=2026-10-01&to=2026-10-31')).status).toBe(404)
  })

  it('rejects an invalid period', async () => {
    expect((await get('from=2026-10-31&to=2026-10-01')).status).toBe(400)
    expect((await get('format=csv')).status).toBe(400)
    expect(mocks.invoice.findMany).not.toHaveBeenCalled()
  })

  it('scopes to the merchant, skips drafts and bounds by Belgrade days', async () => {
    const response = await get('from=2026-10-01&to=2026-10-31')
    expect(response.status).toBe(200)
    const { where } = mocks.invoice.findMany.mock.calls[0][0]
    expect(where.profileId).toBe('profile-a')
    expect(where.status).toEqual({ not: 'DRAFT' })
    expect(where.createdAt.gte.toISOString()).toBe('2026-09-30T22:00:00.000Z')
    expect(where.createdAt.lt.toISOString()).toBe('2026-10-31T23:00:00.000Z')
  })

  it('returns CSV by default and XLSX on request', async () => {
    const csv = await get('from=2026-10-01&to=2026-10-31')
    expect(csv.headers.get('content-type')).toContain('text/csv')
    expect(csv.headers.get('content-disposition')).toContain('fakture_2026-10-01_2026-10-31.csv')
    const xlsx = await get('from=2026-10-01&to=2026-10-31&format=xlsx')
    expect(xlsx.headers.get('content-type')).toContain('spreadsheetml')
  })
})
