import { beforeEach, describe, expect, it, vi } from 'vitest'

const lookup = vi.fn()
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('node:dns/promises', () => ({
  lookup: (...args: unknown[]) => lookup(...args),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}))

import {
  isStoredProductImage,
  persistProductImage,
  scheduleProductImagePersist,
} from './persist-product-image'

const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])

describe('isStoredProductImage', () => {
  it('accepts public product-images on supabase', () => {
    expect(
      isStoredProductImage(
        'https://abc.supabase.co/storage/v1/object/public/product-images/1.jpg'
      )
    ).toBe(true)
  })

  it('rejects external hosts and empty values', () => {
    expect(isStoredProductImage(null)).toBe(false)
    expect(isStoredProductImage('')).toBe(false)
    expect(
      isStoredProductImage(
        'https://images.openfoodfacts.org/images/products/1.jpg'
      )
    ).toBe(false)
  })
})

describe('persistProductImage', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    mockUpload.mockReset()
    mockGetPublicUrl.mockReset()
    lookup.mockReset()
    lookup.mockResolvedValue([{ address: '1.2.3.4', family: 4 }])
  })

  it('returns null for missing urls', async () => {
    expect(await persistProductImage(null)).toBeNull()
    expect(await persistProductImage('')).toBeNull()
  })

  it('returns supabase urls without fetching', async () => {
    const url =
      'https://abc.supabase.co/storage/v1/object/public/product-images/1.jpg'
    const fetchSpy = vi.spyOn(global, 'fetch')
    expect(await persistProductImage(url)).toBe(url)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does not fetch private, localhost, or metadata URLs', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    const metadata = 'http://169.254.169.254/latest/meta-data'
    const loopback = 'http://127.0.0.1/admin'
    const local = 'http://localhost:3000/secret'
    expect(await persistProductImage(metadata)).toBe(metadata)
    expect(await persistProductImage(loopback)).toBe(loopback)
    expect(await persistProductImage(local)).toBe(local)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('uploads a fetched jpeg and returns the public storage url', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(jpegBytes, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })
    )
    mockUpload.mockResolvedValue({ data: { path: 'stored.jpg' }, error: null })
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://abc.supabase.co/storage/v1/object/public/product-images/stored.jpg',
      },
    })

    const stored = await persistProductImage(
      'https://images.openfoodfacts.org/images/products/sprite.jpg'
    )

    expect(stored).toContain('/storage/v1/object/public/product-images/stored.jpg')
    expect(mockUpload).toHaveBeenCalledTimes(1)
    const [, body, options] = mockUpload.mock.calls[0]
    expect(Buffer.isBuffer(body) || body instanceof Uint8Array).toBe(true)
    expect(options).toMatchObject({ contentType: 'image/jpeg', upsert: false })
    vi.mocked(global.fetch).mockRestore()
  })

  it('keeps the original url when the remote file is html', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<html>not an image</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    )
    const original = 'https://ibb.co/landing-page'
    expect(await persistProductImage(original)).toBe(original)
    expect(mockUpload).not.toHaveBeenCalled()
    vi.mocked(global.fetch).mockRestore()
  })

  it('keeps the original url when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'))
    const original = 'https://images.openfoodfacts.org/images/products/1.jpg'
    expect(await persistProductImage(original)).toBe(original)
    vi.mocked(global.fetch).mockRestore()
  })
})

describe('scheduleProductImagePersist', () => {
  it('does not save when the url is already stored', async () => {
    const save = vi.fn()
    scheduleProductImagePersist(
      save,
      'https://abc.supabase.co/storage/v1/object/public/product-images/1.jpg'
    )
    await Promise.resolve()
    expect(save).not.toHaveBeenCalled()
  })
})
