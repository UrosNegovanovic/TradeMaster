import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
import { isPlatformOwner, requirePlatformOwner } from './platform-owner'

const on = { OWNER_PANEL: 'on', PLATFORM_OWNER_USER_IDS: 'user_owner' }

describe('isPlatformOwner', () => {
  it('treats nobody as owner without env', () => {
    expect(isPlatformOwner('user_owner', {})).toBe(false)
    expect(isPlatformOwner('user_owner', { OWNER_PANEL: 'on' })).toBe(false)
    expect(isPlatformOwner('user_owner', { OWNER_PANEL: 'on', PLATFORM_OWNER_USER_IDS: '' })).toBe(false)
  })

  it('needs the switch to be exactly "on"', () => {
    expect(isPlatformOwner('user_owner', { PLATFORM_OWNER_USER_IDS: 'user_owner' })).toBe(false)
    expect(isPlatformOwner('user_owner', { ...on, OWNER_PANEL: 'off' })).toBe(false)
    expect(isPlatformOwner('user_owner', { ...on, OWNER_PANEL: 'true' })).toBe(false)
  })

  it('accepts only listed Clerk user ids', () => {
    expect(isPlatformOwner('user_owner', on)).toBe(true)
    expect(isPlatformOwner('user_tenant', on)).toBe(false)
    // No prefix or substring matches.
    expect(isPlatformOwner('user_own', on)).toBe(false)
    expect(isPlatformOwner('user_owner2', on)).toBe(false)
  })

  it('reads a comma-separated list with spaces and empty entries', () => {
    const env = { OWNER_PANEL: 'on', PLATFORM_OWNER_USER_IDS: ' user_a, ,user_b ,' }
    expect(isPlatformOwner('user_a', env)).toBe(true)
    expect(isPlatformOwner('user_b', env)).toBe(true)
    expect(isPlatformOwner('', env)).toBe(false)
    expect(isPlatformOwner(' ', env)).toBe(false)
  })

  it('is false for a signed-out visitor', () => {
    expect(isPlatformOwner(null, on)).toBe(false)
    expect(isPlatformOwner(undefined, on)).toBe(false)
  })
})

describe('requirePlatformOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OWNER_PANEL', 'on')
    vi.stubEnv('PLATFORM_OWNER_USER_IDS', 'user_owner')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lets the owner through', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    expect(await requirePlatformOwner()).toEqual({ ok: true, userId: 'user_owner' })
  })

  it('answers 404, not 403, for a regular user', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_tenant' } as never)
    const check = await requirePlatformOwner()
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.response.status).toBe(404)
  })

  it('answers the same 404 for a signed-out visitor', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const check = await requirePlatformOwner()
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.response.status).toBe(404)
  })

  it('answers 404 for the listed owner while the panel is off', async () => {
    vi.stubEnv('OWNER_PANEL', '')
    vi.mocked(auth).mockResolvedValue({ userId: 'user_owner' } as never)
    const check = await requirePlatformOwner()
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.response.status).toBe(404)
    expect(auth).not.toHaveBeenCalled()
  })
})
