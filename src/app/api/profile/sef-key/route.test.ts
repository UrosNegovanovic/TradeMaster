import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  sefCredential: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { auth } from '@clerk/nextjs/server'
import { resetRateLimitStore } from '@/lib/rate-limit'
import { decryptSefApiKey } from '@/lib/sef-key-crypto'
import { DELETE, GET, PUT } from './route'

const master = randomBytes(32)
const profile = { id: 'profile-a', accessExpiresAt: null }
const API_KEY = 'aaaa1111-bbbb-2222-cccc-333344445555'
const put = (body: unknown) =>
  new NextRequest('http://localhost/api/profile/sef-key', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('/api/profile/sef-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitStore()
    vi.stubEnv('SEF_KEY_ENCRYPTION_KEY', master.toString('base64'))
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('stores only ciphertext bound to the company and answers without the key', async () => {
    const response = await PUT(put({ apiKey: ` ${API_KEY} ` }))
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).not.toContain(API_KEY)
    expect(JSON.parse(text)).toEqual({ available: true, configured: true, environment: 'demo' })
    const saved = mocks.sefCredential.upsert.mock.calls[0][0].create.apiKeyCiphertext as string
    expect(saved).not.toContain(API_KEY)
    expect(decryptSefApiKey(saved, 'profile-a', master)).toBe(API_KEY)
  })

  it('GET says only whether a key is saved', async () => {
    mocks.sefCredential.findUnique.mockResolvedValue({ profileId: 'profile-a' })
    const body = await (await GET()).json()
    expect(body).toEqual({ available: true, configured: true, environment: 'demo' })
    expect(mocks.sefCredential.findUnique.mock.calls[0][0].select).toEqual({ profileId: true })
  })

  it('validates the key, and refuses saving on an expired account; deleting stays allowed', async () => {
    expect((await PUT(put({ apiKey: 'short' }))).status).toBe(400)
    expect((await PUT(put({ apiKey: 'has spaces inside the key' }))).status).toBe(400)
    mocks.profile.findUnique.mockResolvedValue({ ...profile, accessExpiresAt: new Date('2020-01-01') })
    expect((await PUT(put({ apiKey: API_KEY }))).status).toBe(402)
    expect(mocks.sefCredential.upsert).not.toHaveBeenCalled()
    expect((await DELETE(new NextRequest('http://localhost/api/profile/sef-key', { method: 'DELETE' }))).status).toBe(200)
    expect(mocks.sefCredential.deleteMany).toHaveBeenCalledWith({ where: { profileId: 'profile-a' } })
  })
})
