import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { uploadImageViaApi } from './client-image-upload'

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])

describe('uploadImageViaApi', () => {
  it('posts product images to Clerk /api/uploads and does not call Storage INSERT from the browser', async () => {
    const storageInsert = vi.fn()
    const request = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/storage/v1/object') || url.includes('supabase.co')) {
        storageInsert()
        return new Response(JSON.stringify({ message: 'new row violates row-level security policy' }), {
          status: 403,
        })
      }
      expect(url).toBe('/api/uploads')
      return new Response(
        JSON.stringify({
          url: 'https://abc.supabase.co/storage/v1/object/public/product-images/profile-a/photo.jpg',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })

    const stored = await uploadImageViaApi(
      new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' }),
      'product-images',
      request
    )

    expect(stored).toContain('/storage/v1/object/public/product-images/')
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(
      '/api/uploads',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    )
    const [, init] = request.mock.calls[0] as [string, { body: FormData }]
    expect(init.body.get('bucket')).toBe('product-images')
    expect(init.body.get('file')).toBeInstanceOf(File)
    expect(storageInsert).not.toHaveBeenCalled()
  })
})

describe('browser product image upload source', () => {
  it('keeps ImageUpload on the Clerk upload helper and off the anon Storage client', () => {
    const imageUpload = readFileSync(
      path.join(process.cwd(), 'src/components/shared/ImageUpload.tsx'),
      'utf8'
    )
    const helper = readFileSync(path.join(process.cwd(), 'src/lib/client-image-upload.ts'), 'utf8')
    const supabaseClient = readFileSync(path.join(process.cwd(), 'src/lib/supabase-client.ts'), 'utf8')

    expect(imageUpload).toContain("from '@/lib/client-image-upload'")
    expect(imageUpload).not.toMatch(/supabase-client|supabase\.storage|storage\.from/)
    expect(helper).toContain("'/api/uploads'")
    expect(helper).not.toMatch(/supabase-client|supabase\.storage|storage\.from|NEXT_PUBLIC_SUPABASE_ANON_KEY/)
    expect(supabaseClient).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(supabaseClient).not.toMatch(/uploadImageViaApi|\/api\/uploads/)
  })
})
