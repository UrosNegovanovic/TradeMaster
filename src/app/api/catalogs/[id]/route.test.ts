import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  catalog: { findUnique: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

function getRequest(id: string) {
  return new NextRequest(`http://localhost/api/catalogs/${id}`)
}

describe('GET /api/catalogs/[id] (owner API)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for guests instead of leaking catalog JSON', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(401)
    expect(mocks.catalog.findUnique).not.toHaveBeenCalled()
  })

  it('returns 403 when another company is signed in', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-b' } as never)
    mocks.profile.findUnique.mockResolvedValue({ id: 'profile-b', clerkUserId: 'user-b' })
    mocks.catalog.findUnique.mockResolvedValue({
      id: 'cat-1',
      profileId: 'profile-a',
      profile: { companyName: 'A' },
      items: [],
    })
    const response = await GET(getRequest('cat-1'), { params: { id: 'cat-1' } })
    expect(response.status).toBe(403)
  })
})
