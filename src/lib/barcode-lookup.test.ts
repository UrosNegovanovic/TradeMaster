import { describe, expect, it, vi } from 'vitest'
import { EXTERNAL_LOOKUP_BUDGET_MS, firstExternalBarcodeMatch, notFoundBarcode } from './barcode-lookup'

describe('firstExternalBarcodeMatch', () => {
  it('returns the first fetcher that finds a product', async () => {
    const food = vi.fn().mockResolvedValue(null)
    const beauty = vi.fn().mockResolvedValue({
      name: 'TIC TAC',
      description: '',
      imageUrl: null,
      found: true,
      barcode: '80052043',
      source: 'beauty',
    })
    const upc = vi.fn()

    await expect(firstExternalBarcodeMatch('80052043', [food, beauty, upc])).resolves.toMatchObject({
      found: true,
      source: 'beauty',
    })
    expect(upc).not.toHaveBeenCalled()
  })

  it('stops calling fetchers once the Vercel budget is spent', async () => {
    let now = 0
    const food = vi.fn().mockImplementation(async (_barcode: string, timeoutMs: number) => {
      expect(timeoutMs).toBe(EXTERNAL_LOOKUP_BUDGET_MS)
      now = EXTERNAL_LOOKUP_BUDGET_MS
      return null
    })
    const beauty = vi.fn()

    await expect(
      firstExternalBarcodeMatch('86044493', [food, beauty], () => now)
    ).resolves.toBeNull()
    expect(food).toHaveBeenCalledTimes(1)
    expect(beauty).not.toHaveBeenCalled()
  })
})

describe('notFoundBarcode', () => {
  it('is a 200-shaped miss so the scan client does not throw on unknown SKUs', () => {
    expect(notFoundBarcode('80052043')).toEqual({
      name: '',
      description: '',
      imageUrl: null,
      found: false,
      barcode: '80052043',
    })
  })
})
