import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchProductMetadata } from './openfoodfacts'

describe('fetchProductMetadata', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('input validation', () => {
    it('returns null when barcode has fewer than 8 digits after cleaning', async () => {
      const result = await fetchProductMetadata('1234567')
      expect(result).toBeNull()
      const barcodeApiCalls = fetchMock.mock.calls.filter((c: unknown[]) =>
        String(c[0]).includes('fetch-by-barcode')
      )
      expect(barcodeApiCalls).toHaveLength(0)
    })

    it('returns null when barcode is empty', async () => {
      const result = await fetchProductMetadata('')
      expect(result).toBeNull()
      const barcodeApiCalls = fetchMock.mock.calls.filter((c: unknown[]) =>
        String(c[0]).includes('fetch-by-barcode')
      )
      expect(barcodeApiCalls).toHaveLength(0)
    })

    it('strips non-digits and validates by cleaned length', async () => {
      const result = await fetchProductMetadata('12345')
      expect(result).toBeNull()
      const barcodeApiCalls = fetchMock.mock.calls.filter((c: unknown[]) =>
        String(c[0]).includes('fetch-by-barcode')
      )
      expect(barcodeApiCalls).toHaveLength(0)
    })
  })

  describe('happy path — product found', () => {
    it('returns ProductMetadata when API returns found product', async () => {
      const mockMetadata = {
        name: 'Test Product',
        description: 'Brand: TestBrand',
        imageUrl: 'https://example.com/img.png',
        found: true,
        barcode: '1234567890123',
        source: 'local',
      }

      fetchMock.mockImplementation((url: string | URL) => {
        if (typeof url === 'string' && url.includes('fetch-by-barcode')) {
          return Promise.resolve(
            new Response(JSON.stringify(mockMetadata), { status: 200 })
          )
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      })

      const result = await fetchProductMetadata('1234567890123')

      expect(result).not.toBeNull()
      expect(result).toEqual(mockMetadata)
      expect(result?.found).toBe(true)
      expect(result?.name).toBe('Test Product')
    })

    it('calls fetch with correct URL and barcode param', async () => {
      fetchMock.mockImplementation((url: string | URL) => {
        if (typeof url === 'string' && url.includes('fetch-by-barcode')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                name: 'P',
                description: '',
                imageUrl: null,
                found: true,
                barcode: '5901234123457',
              }),
              { status: 200 }
            )
          )
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      })

      await fetchProductMetadata('5901234123457')

      const barcodeCall = fetchMock.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && call[0].includes('fetch-by-barcode')
      )
      expect(barcodeCall).toBeDefined()
      expect(barcodeCall![0]).toContain('barcode=5901234123457')
      const opts = barcodeCall![1] as { headers?: Record<string, string> } | undefined
      expect(opts?.headers?.['Content-Type']).toBe('application/json')
    })
  })

  describe('error paths', () => {
    it('returns null when API returns non-OK status', async () => {
      fetchMock.mockImplementation((url: string | URL) => {
        if (typeof url === 'string' && url.includes('fetch-by-barcode')) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Not found' }), {
              status: 404,
            })
          )
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      })

      const result = await fetchProductMetadata('1234567890123')

      expect(result).toBeNull()
    })

    it('returns null when fetch rejects (network error)', async () => {
      fetchMock.mockImplementation((url: string | URL) => {
        if (typeof url === 'string' && url.includes('fetch-by-barcode')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      })

      const result = await fetchProductMetadata('1234567890123')

      expect(result).toBeNull()
    })

    it('returns product with found: false when API returns not found', async () => {
      fetchMock.mockImplementation((url: string | URL) => {
        if (typeof url === 'string' && url.includes('fetch-by-barcode')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                name: '',
                description: '',
                imageUrl: null,
                found: false,
                barcode: '1234567890123',
              }),
              { status: 200 }
            )
          )
        }
        return Promise.resolve(new Response('{}', { status: 200 }))
      })

      const result = await fetchProductMetadata('1234567890123')

      expect(result).not.toBeNull()
      expect(result?.found).toBe(false)
    })
  })
})
