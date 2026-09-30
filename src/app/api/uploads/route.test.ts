import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  uploadPublicImage: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { profile: mocks.profile },
}))

vi.mock('@/lib/server-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server-storage')>('@/lib/server-storage')
  return {
    ...actual,
    uploadPublicImage: mocks.uploadPublicImage,
  }
})

import { auth } from '@clerk/nextjs/server'
import { POST } from './route'

const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])

function postRequest(body: FormData) {
  return new NextRequest('http://localhost/api/uploads', { method: 'POST', body })
}

describe('POST /api/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue({ id: 'profile-a' })
    mocks.uploadPublicImage.mockResolvedValue(
      'https://abc.supabase.co/storage/v1/object/public/product-images/profile-a/stored.jpg'
    )
  })

  it('returns 401 for guests', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const form = new FormData()
    form.set('bucket', 'product-images')
    form.set('file', new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' }))
    const response = await POST(postRequest(form))
    expect(response.status).toBe(401)
    expect(mocks.uploadPublicImage).not.toHaveBeenCalled()
  })

  it('rejects an unknown bucket', async () => {
    const form = new FormData()
    form.set('bucket', 'other-bucket')
    form.set('file', new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' }))
    const response = await POST(postRequest(form))
    expect(response.status).toBe(400)
    expect(mocks.uploadPublicImage).not.toHaveBeenCalled()
  })

  it('rejects a non-image payload', async () => {
    const form = new FormData()
    form.set('bucket', 'product-images')
    form.set('file', new File(['not-an-image'], 'note.txt', { type: 'text/plain' }))
    const response = await POST(postRequest(form))
    expect(response.status).toBe(415)
    expect(mocks.uploadPublicImage).not.toHaveBeenCalled()
  })

  it('uploads a jpeg for the signed-in profile', async () => {
    const form = new FormData()
    form.set('bucket', 'merchant-logos')
    form.set('file', new File([jpegBytes], 'logo.jpg', { type: 'image/jpeg' }))
    const response = await POST(postRequest(form))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      url: expect.stringContaining('/storage/v1/object/public/product-images/'),
      bucket: 'merchant-logos',
    })
    expect(mocks.uploadPublicImage).toHaveBeenCalledTimes(1)
    const [options] = mocks.uploadPublicImage.mock.calls[0]
    expect(options.bucket).toBe('merchant-logos')
    expect(options.path).toMatch(/^profile-a\/.+\.jpg$/)
    expect(options.contentType).toBe('image/jpeg')
  })
})
