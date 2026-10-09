import * as XLSX from 'xlsx'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  product: { findMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

const get = (query = '') => new NextRequest(`http://localhost/api/warehouse/stock-list${query}`)

describe('GET /api/warehouse/stock-list (ROADMAP A9.19)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue({ id: 'profile-a', accessExpiresAt: new Date('2020-01-01') })
    mocks.product.findMany.mockResolvedValue([
      { sku: 'K1', name: 'Kafa', quantity: 3, price: '100', costPrice: '70', createdAt: new Date(), category: null },
    ])
  })

  it('answers 401 without a session', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await GET(get())).status).toBe(401)
    expect(mocks.product.findMany).not.toHaveBeenCalled()
  })

  it('reads only the signed-in company, also after access expired, and returns an XLSX file', async () => {
    const response = await GET(get())
    expect(response.status).toBe(200)
    expect(mocks.product.findMany.mock.calls[0][0].where).toEqual({ profileId: 'profile-a' })
    expect(response.headers.get('content-disposition')).toMatch(/lager-lista_\d{4}-\d{2}-\d{2}\.xlsx/)
    const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Lager lista'], { header: 1 })
    expect(rows[1]).toEqual(['K1', 'Kafa', '', 3, 70, 100, 210, 300])
  })

  it('returns CSV on request', async () => {
    const response = await GET(get('?format=csv'))
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(await response.text()).toContain('K1;Kafa;;3;70;100;210;300')
  })
})
