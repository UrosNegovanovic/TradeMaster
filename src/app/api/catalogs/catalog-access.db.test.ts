import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { GET } from './[id]/route'

const prefix = `catalog-access-${randomUUID()}`
const users = {
  a: { clerkUserId: `${prefix}-a`, profileId: '' },
  b: { clerkUserId: `${prefix}-b`, profileId: '' },
}
let catalogId = ''
let productId = ''

function login(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as never)
}

function privateRead() {
  return GET(new NextRequest(`http://localhost/api/catalogs/${catalogId}`), { params: { id: catalogId } })
}

async function enableShare() {
  const { POST } = await import('./[id]/share/route')
  const response = await POST(new NextRequest(`http://localhost/api/catalogs/${catalogId}/share`, { method: 'POST' }), { params: { id: catalogId } })
  expect(response.ok).toBe(true)
  const { url } = await response.json()
  expect(url).toMatch(/^\/shared\/catalog\/[A-Za-z0-9_-]+$/)
  const token = url.split('/').pop() as string
  expect(token.length).toBeGreaterThanOrEqual(32)
  expect(token).not.toBe(catalogId)
  return token
}

async function publicRead(token: string) {
  const { GET: publicGET } = await import('../shared/catalog/[token]/route')
  return publicGET(new NextRequest(`http://localhost/api/shared/catalog/${token}`), { params: { token } })
}

function assertNoPrivateFields(value: unknown) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    expect(['profileId', 'clerkUserId', 'quantity', 'minStock', 'shareToken', 'shareEnabled']).not.toContain(key)
    assertNoPrivateFields(child)
  }
}

describe('catalog access against a dedicated test database', () => {
  beforeAll(async () => {
    for (const user of Object.values(users)) {
      const profile = await prisma.profile.create({
        data: { clerkUserId: user.clerkUserId, companyName: prefix, contactEmail: 'sales@example.test' },
      })
      user.profileId = profile.id
    }
    const product = await prisma.product.create({
      data: { profileId: users.a.profileId, name: 'Catalog product', sku: prefix, price: 30, quantity: 77, minStock: 9 },
    })
    productId = product.id
    const catalog = await prisma.catalog.create({
      data: {
        profileId: users.a.profileId, name: 'Buyer offer', clientName: 'Buyer', notes: 'Offer notes', discount: 10,
        items: { create: { productId, originalPrice: 20, discountedPrice: 18 } },
      },
    })
    catalogId = catalog.id
  })

  beforeEach(() => { vi.mocked(auth).mockReset(); login(users.a.clerkUserId) })

  afterAll(async () => {
    try {
      const ids = Object.values(users).map((user) => user.profileId).filter(Boolean)
      if (ids.length) await prisma.profile.deleteMany({ where: { id: { in: ids } } })
    } finally { await prisma.$disconnect() }
  })

  it('rejects anonymous private reads', async () => {
    login(null)
    expect((await privateRead()).status).toBe(401)
  })

  it('rejects a signed-in user without a profile', async () => {
    login(`${prefix}-missing-profile`)
    expect((await privateRead()).status).toBe(404)
  })

  it('hides another tenant catalog', async () => {
    login(users.b.clerkUserId)
    expect((await privateRead()).status).toBe(404)
  })

  it('allows the owner private access', async () => {
    const response = await privateRead()
    expect(response.status).toBe(200)
    expect((await response.json()).id).toBe(catalogId)
  })

  it('lets the owner share with guests using a safe DTO and snapshot prices', async () => {
    const token = await enableShare()
    login(null)
    const response = await publicRead(token)
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ name: 'Buyer offer', clientName: 'Buyer', notes: 'Offer notes' })
    expect(Number(payload.discount)).toBe(10)
    expect(payload.profile).toMatchObject({ companyName: prefix, contactEmail: 'sales@example.test' })
    expect(payload.items).toHaveLength(1)
    expect(Number(payload.items[0].originalPrice)).toBe(20)
    expect(Number(payload.items[0].discountedPrice)).toBe(18)
    expect(payload.items[0].product.name).toBe('Catalog product')
    expect(payload.items[0].product).not.toHaveProperty('price')
    assertNoPrivateFields(payload)

    await prisma.product.update({ where: { id: productId }, data: { price: 999 } })
    const afterPriceChange = await (await publicRead(token)).json()
    expect(Number(afterPriceChange.items[0].originalPrice)).toBe(20)
    expect(Number(afterPriceChange.items[0].discountedPrice)).toBe(18)
    expect(afterPriceChange.items[0].product).not.toHaveProperty('price')
  })

  it('rejects share creation and revocation by another tenant', async () => {
    const token = await enableShare()
    const { POST, DELETE } = await import('./[id]/share/route')
    login(users.b.clerkUserId)
    const url = `http://localhost/api/catalogs/${catalogId}/share`
    expect((await POST(new NextRequest(url, { method: 'POST' }), { params: { id: catalogId } })).status).toBe(404)
    expect((await DELETE(new NextRequest(url, { method: 'DELETE' }), { params: { id: catalogId } })).status).toBe(404)
    login(null)
    expect((await publicRead(token)).status).toBe(200)
  })

  it('revokes the public token and never accepts a private catalog id as a token', async () => {
    const token = await enableShare()
    const { DELETE } = await import('./[id]/share/route')
    const response = await DELETE(new NextRequest(`http://localhost/api/catalogs/${catalogId}/share`, { method: 'DELETE' }), { params: { id: catalogId } })
    expect(response.ok).toBe(true)
    login(null)
    expect((await publicRead(token)).status).toBe(404)
    expect((await publicRead(catalogId)).status).toBe(404)
  })

  it('rotates a share token so only the latest link works', async () => {
    const previous = await enableShare()
    const next = await enableShare()
    expect(next).not.toBe(previous)
    login(null)
    expect((await publicRead(previous)).status).toBe(404)
    expect((await publicRead(next)).status).toBe(200)
  })
})
