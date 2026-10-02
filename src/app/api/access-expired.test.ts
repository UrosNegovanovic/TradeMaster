import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))

// Any prisma call other than the profile lookup would mean a write path ran for an expired account.
const mocks = vi.hoisted(() => {
  const findUnique = vi.fn()
  const unexpected = (path: string) =>
    new Proxy(() => undefined, {
      get: (_target, prop) => unexpected(`${path}.${String(prop)}`),
      apply: () => {
        throw new Error(`Unexpected prisma call: ${path}`)
      },
    })
  const prisma = new Proxy(
    { profile: { findUnique } } as Record<string, unknown>,
    { get: (target, prop: string) => target[prop] ?? unexpected(prop) }
  )
  return { findUnique, prisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))

import { auth } from '@clerk/nextjs/server'
import { POST as productsPost } from './products/route'
import { PUT as productPut, DELETE as productDelete } from './products/[id]/route'
import { POST as invoicesPost } from './invoices/route'
import { PATCH as invoicePatch } from './invoices/[id]/route'
import { POST as catalogsPost } from './catalogs/route'
import { POST as clientsPost } from './clients/route'
import { POST as movementsPost } from './stock-movements/route'
import { POST as bulkAdjustPost } from './products/bulk-adjust/route'
import { POST as catalogSharePost, DELETE as catalogShareDelete } from './catalogs/[id]/share/route'

const expiredProfile = { id: 'p1', clerkUserId: 'u1', accessExpiresAt: new Date('2020-01-01T00:00:00.000Z') }

const json = (method: string, body: unknown = {}) =>
  new NextRequest('http://localhost/api/x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const params = { params: { id: 'x' } } as never
const asyncParams = { params: Promise.resolve({ id: 'x' }) } as never

describe('expired access is read-only', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'u1' } as never)
    mocks.findUnique.mockResolvedValue(expiredProfile)
  })

  it.each([
    ['POST /api/products', () => productsPost(json('POST'))],
    ['PUT /api/products/[id]', () => productPut(json('PUT'), asyncParams)],
    ['DELETE /api/products/[id]', () => productDelete(json('DELETE'), asyncParams)],
    ['POST /api/invoices', () => invoicesPost(json('POST'))],
    ['PATCH /api/invoices/[id]', () => invoicePatch(json('PATCH'), asyncParams)],
    ['POST /api/catalogs', () => catalogsPost(json('POST'))],
    ['POST /api/clients', () => clientsPost(json('POST'))],
    ['POST /api/stock-movements', () => movementsPost(json('POST'))],
    ['POST /api/products/bulk-adjust', () => bulkAdjustPost(json('POST'))],
    ['POST /api/catalogs/[id]/share', () => catalogSharePost(json('POST'), params)],
  ])('%s answers 402 and touches no data', async (_name, call) => {
    const response = await call()
    expect(response.status).toBe(402)
    expect((await response.json()).code).toBe('ACCESS_EXPIRED')
  })

  it('still lets an expired account revoke a share link (privacy)', async () => {
    // Revoking passes the access check and only then fails on the missing catalog in this minimal mock.
    await expect(catalogShareDelete(json('DELETE'), params)).rejects.toThrow(/Unexpected prisma call: catalog/)
  })

  it('does not block an active account', async () => {
    mocks.findUnique.mockResolvedValue({ ...expiredProfile, accessExpiresAt: new Date('2999-01-01T00:00:00.000Z') })
    await expect(catalogSharePost(json('POST'), params)).rejects.toThrow(/Unexpected prisma call: catalog/)
  })
})
