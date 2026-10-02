import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  invoice: { findFirst: vi.fn(), update: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { auth } from '@clerk/nextjs/server'
import { DELETE, GET, POST } from './route'

const params = { params: { id: 'inv_1' } }
const request = (method: string) => new NextRequest('http://localhost/api/invoices/inv_1/share', { method })

function login(invoice: Record<string, unknown> | null) {
  vi.mocked(auth).mockResolvedValue({ userId: 'user_1' } as never)
  mocks.profile.findUnique.mockResolvedValue({ id: 'profile_1' })
  mocks.invoice.findFirst.mockResolvedValue(invoice)
}

describe('/api/invoices/[id]/share', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 for guests', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await POST(request('POST'), params)).status).toBe(401)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })

  it('scopes the lookup to the signed-in tenant', async () => {
    login(null)
    expect((await POST(request('POST'), params)).status).toBe(404)
    expect(mocks.invoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'inv_1', profileId: 'profile_1' } }))
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })

  it('refuses to share a draft', async () => {
    login({ id: 'inv_1', status: 'DRAFT', shareToken: null, shareEnabled: false })
    expect((await POST(request('POST'), params)).status).toBe(409)
    expect(mocks.invoice.update).not.toHaveBeenCalled()
  })

  it('issues a fresh 64-hex token for an issued invoice', async () => {
    login({ id: 'inv_1', status: 'UNPAID', shareToken: 'd'.repeat(64), shareEnabled: true })
    const response = await POST(request('POST'), params)
    const { url } = await response.json()
    expect(url).toMatch(/^\/shared\/invoice\/[a-f0-9]{64}$/)
    expect(url).not.toContain('d'.repeat(64))
    const token = url.split('/').pop()
    expect(mocks.invoice.update).toHaveBeenCalledWith({ where: { id: 'inv_1' }, data: { shareToken: token, shareEnabled: true } })
  })

  it('reports no link for a draft even if an old token exists', async () => {
    login({ id: 'inv_1', status: 'DRAFT', shareToken: 'e'.repeat(64), shareEnabled: true })
    await expect((await GET(request('GET'), params)).json()).resolves.toEqual({ url: null })
  })

  it('revokes the link', async () => {
    login({ id: 'inv_1', status: 'PAID', shareToken: 'e'.repeat(64), shareEnabled: true })
    await expect((await DELETE(request('DELETE'), params)).json()).resolves.toEqual({ url: null })
    expect(mocks.invoice.update).toHaveBeenCalledWith({ where: { id: 'inv_1' }, data: { shareToken: null, shareEnabled: false } })
  })
})
