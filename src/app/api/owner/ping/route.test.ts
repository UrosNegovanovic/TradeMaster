import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

describe('GET /api/owner/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OWNER_PANEL', 'on')
    vi.stubEnv('PLATFORM_OWNER_USER_IDS', 'user_owner')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('answers the platform owner', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('is 404 for a regular signed-in user', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_tenant' } as never)
    const response = await GET()
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })

  it('is 404 for a signed-out visitor, not 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await GET()).status).toBe(404)
  })

  it('is 404 for everyone when no owner is configured', async () => {
    vi.stubEnv('PLATFORM_OWNER_USER_IDS', '')
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    expect((await GET()).status).toBe(404)
  })
})
