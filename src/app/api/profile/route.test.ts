import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { profile: mocks.profile },
}))

import { auth } from '@clerk/nextjs/server'
import { GET, PUT } from './route'

function putRequest(body: unknown) {
  return new NextRequest('http://localhost/api/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
  })

  it('returns field issues instead of a raw Error object', async () => {
    const response = await PUT(
      putRequest({
        companyName: 'Firma',
        contactEmail: 'not-an-email',
        pib: '123',
      })
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Validation error')
    expect(Array.isArray(body.details)).toBe(true)
    expect(body.details.length).toBeGreaterThan(0)
    expect(body.details[0]).toEqual(
      expect.objectContaining({
        path: expect.any(String),
        message: expect.any(String),
      })
    )
    expect(body).not.toHaveProperty('details.name')
    expect(JSON.stringify(body)).not.toMatch(/ZodError/)
    expect(JSON.stringify(body)).not.toMatch(/"stack"/)
    expect(mocks.profile.upsert).not.toHaveBeenCalled()
  })

  it('stores a public merchant-logo URL', async () => {
    const logoUrl =
      'https://abc.supabase.co/storage/v1/object/public/merchant-logos/p/logo.jpg'
    mocks.profile.upsert.mockResolvedValue({ logoUrl })

    const response = await PUT(
      putRequest({
        companyName: 'T&G Nest',
        pib: '123124121',
        logoUrl,
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ logoUrl }),
        create: expect.objectContaining({ logoUrl }),
      })
    )
  })

  it('does not wipe an existing logo when the client omits logoUrl', async () => {
    mocks.profile.upsert.mockResolvedValue({ companyName: 'T&G Nest' })

    const response = await PUT(
      putRequest({
        companyName: 'T&G Nest',
        pib: '123124121',
      })
    )

    expect(response.status).toBe(200)
    const arg = mocks.profile.upsert.mock.calls[0][0]
    expect(arg.update).not.toHaveProperty('logoUrl')
    expect(arg.create).not.toHaveProperty('logoUrl')
  })

  it('does not persist a FileReader data URL', async () => {
    mocks.profile.upsert.mockResolvedValue({ companyName: 'T&G Nest' })

    const response = await PUT(
      putRequest({
        companyName: 'T&G Nest',
        pib: '123124121',
        logoUrl: 'data:image/png;base64,aaa',
      })
    )

    expect(response.status).toBe(200)
    const arg = mocks.profile.upsert.mock.calls[0][0]
    expect(arg.update).not.toHaveProperty('logoUrl')
  })
})

describe('access period (manual billing)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
  })

  it('gives a company created by GET about 60 days of access', async () => {
    mocks.profile.findUnique.mockResolvedValue(null)
    mocks.profile.create.mockResolvedValue({ id: 'p1' })

    expect((await GET()).status).toBe(200)

    const { data } = mocks.profile.create.mock.calls[0][0]
    const days = (new Date(data.accessExpiresAt).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(58.9)
    expect(days).toBeLessThan(60.1)
  })

  it('does not touch the access period of an existing company', async () => {
    mocks.profile.findUnique.mockResolvedValue({ id: 'p1', accessExpiresAt: null })
    expect((await GET()).status).toBe(200)
    expect(mocks.profile.create).not.toHaveBeenCalled()
  })

  it('sets the period only when PUT creates the profile, and never lets the client change it', async () => {
    mocks.profile.upsert.mockResolvedValue({ id: 'p1' })

    const response = await PUT(
      putRequest({ companyName: 'Firma', pib: '123124121', accessExpiresAt: '2099-01-01T00:00:00.000Z' })
    )

    expect(response.status).toBe(200)
    const arg = mocks.profile.upsert.mock.calls[0][0]
    expect(arg.update).not.toHaveProperty('accessExpiresAt')
    expect(new Date(arg.create.accessExpiresAt).getFullYear()).toBeLessThan(2099)
  })
})
