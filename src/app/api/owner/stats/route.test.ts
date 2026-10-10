import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

const mocks = vi.hoisted(() => ({ loadOwnerStats: vi.fn() }))

vi.mock('@/lib/owner-stats-query', () => ({
  loadOwnerStats: mocks.loadOwnerStats,
}))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

describe('GET /api/owner/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OWNER_PANEL', 'on')
    vi.stubEnv('PLATFORM_OWNER_USER_IDS', 'user_owner')
    vi.stubEnv('BILLING_ISSUER_PROFILE_ID', 'issuer')
    vi.stubEnv('BILLING_EXCLUDE_PROFILE_IDS', 'own-a')
    vi.stubEnv('PLATFORM_DEMO_PROFILE_IDS', 'demo')
    mocks.loadOwnerStats.mockResolvedValue({ totalCompanies: 3 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the statistics to the platform owner, without the owner’s own and demo profiles', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ totalCompanies: 3 })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.loadOwnerStats).toHaveBeenCalledWith(expect.anything(), { excludeProfileIds: ['issuer', 'own-a', 'demo'] })
  })

  it('is 404 for a regular signed-in user and reads nothing', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_tenant' } as never)
    const response = await GET()
    expect(response.status).toBe(404)
    expect(mocks.loadOwnerStats).not.toHaveBeenCalled()
  })

  it('is 404 for a signed-out visitor and reads nothing', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await GET()).status).toBe(404)
    expect(mocks.loadOwnerStats).not.toHaveBeenCalled()
  })

  it('is 404 while the panel is off', async () => {
    vi.stubEnv('OWNER_PANEL', '')
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    expect((await GET()).status).toBe(404)
    expect(mocks.loadOwnerStats).not.toHaveBeenCalled()
  })

  it('answers 500 without details when the database fails', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    mocks.loadOwnerStats.mockRejectedValue(new Error('connection refused at db.internal'))
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await GET()
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal server error' })
    errorLog.mockRestore()
  })
})
