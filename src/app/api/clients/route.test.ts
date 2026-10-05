import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  client: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { GET, POST } from './route'
import { PUT, DELETE } from './[id]/route'

const profile = { id: 'profile-a', clerkUserId: 'user-a' }

function jsonRequest(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/clients', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
  })

  it('requires authentication', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await GET()).status).toBe(401)
    expect((await POST(jsonRequest('POST', { name: 'A' }))).status).toBe(401)
    expect(mocks.client.findMany).not.toHaveBeenCalled()
  })

  it('returns 404 until the profile exists', async () => {
    mocks.profile.findUnique.mockResolvedValue(null)
    expect((await GET()).status).toBe(404)
  })

  it('lists only the merchant clients', async () => {
    mocks.client.findMany.mockResolvedValue([])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(mocks.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: profile.id } })
    )
  })

  it('creates a client on the merchant profile and normalizes blanks', async () => {
    mocks.client.create.mockResolvedValue({ id: 'c1' })
    const response = await POST(
      jsonRequest('POST', { name: '  Kupac DOO ', pib: ' 123456789 ', address: '  ' })
    )
    expect(response.status).toBe(201)
    expect(mocks.client.create).toHaveBeenCalledWith({
      data: { name: 'Kupac DOO', pib: '123456789', address: null, registrationNumber: null, profileId: profile.id },
    })
  })

  it('rejects an invalid PIB and an empty name', async () => {
    expect((await POST(jsonRequest('POST', { name: 'A', pib: '12345' }))).status).toBe(400)
    expect((await POST(jsonRequest('POST', { name: 'A', registrationNumber: '123' }))).status).toBe(400)
    expect((await POST(jsonRequest('POST', { name: '   ' }))).status).toBe(400)
    expect(mocks.client.create).not.toHaveBeenCalled()
  })

  it('does not update or delete another merchant client', async () => {
    mocks.client.findFirst.mockResolvedValue(null)
    expect((await PUT(jsonRequest('PUT', { name: 'X' }), ctx('c-other'))).status).toBe(404)
    expect((await DELETE(jsonRequest('DELETE', {}), ctx('c-other'))).status).toBe(404)
    expect(mocks.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'c-other', profileId: profile.id },
    })
    expect(mocks.client.update).not.toHaveBeenCalled()
    expect(mocks.client.delete).not.toHaveBeenCalled()
  })

  it('updates and deletes an owned client', async () => {
    mocks.client.findFirst.mockResolvedValue({ id: 'c1', profileId: profile.id })
    mocks.client.update.mockResolvedValue({ id: 'c1' })
    const put = await PUT(jsonRequest('PUT', { name: 'Novi naziv', pib: '', address: 'Adresa 1' }), ctx('c1'))
    expect(put.status).toBe(200)
    expect(mocks.client.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Novi naziv', pib: null, address: 'Adresa 1', registrationNumber: null },
    })
    expect((await DELETE(jsonRequest('DELETE', {}), ctx('c1'))).status).toBe(200)
    expect(mocks.client.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })
})
