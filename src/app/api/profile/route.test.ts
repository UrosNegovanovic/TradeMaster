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
import { PUT } from './route'

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
})
