import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  category: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { GET, POST } from './route'

const profile = { id: 'profile-a', clerkUserId: 'user-a' }

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/categories', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
  })

  it('lists only categories for the authenticated merchant', async () => {
    mocks.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Piće', profileId: profile.id }])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(mocks.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: profile.id },
      })
    )
  })

  it('creates a category on the merchant profile, not a global list', async () => {
    mocks.category.findFirst.mockResolvedValue(null)
    mocks.category.create.mockResolvedValue({
      id: 'cat-2',
      name: 'Kafa',
      profileId: profile.id,
    })
    const response = await POST(postRequest({ name: 'Kafa' }))
    expect(response.status).toBe(201)
    expect(mocks.category.create).toHaveBeenCalledWith({
      data: {
        name: 'Kafa',
        description: null,
        profileId: profile.id,
      },
    })
  })

  it('rejects a duplicate name for the same merchant', async () => {
    mocks.category.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Kafa' })
    const response = await POST(postRequest({ name: 'Kafa' }))
    expect(response.status).toBe(409)
    expect(mocks.category.create).not.toHaveBeenCalled()
  })
})
