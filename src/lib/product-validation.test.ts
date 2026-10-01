import { describe, expect, it } from 'vitest'
import { productIntakeSchema, productSchema } from './validations'

const base = { name: 'Sok', sku: '8600000000001', quantity: 1 }

describe('productIntakeSchema price', () => {
  it('accepts a zero or omitted selling price for warehouse intake', () => {
    expect(productIntakeSchema.safeParse({ ...base, price: 0 }).success).toBe(true)
    expect(productIntakeSchema.safeParse(base).success).toBe(true)
    expect(productIntakeSchema.safeParse({ ...base, price: -1 }).success).toBe(false)
    expect(productIntakeSchema.safeParse({ ...base, price: 0.01 }).success).toBe(true)
  })

  it('defaults an omitted selling price to 0', () => {
    const parsed = productIntakeSchema.parse(base)
    expect(parsed.price).toBe(0)
  })

  it('accepts a Quick Scan body with price 0 and no costPrice', () => {
    const scanned = {
      name: 'Unknown Product',
      sku: '8600000000001',
      price: 0,
      quantity: 1,
      description: '',
      imageUrl: '',
      categoryId: null,
    }
    const parsed = productIntakeSchema.safeParse(scanned)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.price).toBe(0)
      expect(parsed.data.costPrice).toBeUndefined()
    }
  })
})

describe('productSchema price', () => {
  it('requires a positive selling price for product creation and editing', () => {
    expect(productSchema.safeParse({ ...base, price: 0, costPrice: 10 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: -1, costPrice: 10 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: 0.01, costPrice: 10 }).success).toBe(true)
  })

  it('requires a non-negative purchase price and a note only when that price is 0', () => {
    const priced = { ...base, price: 120 }

    expect(productSchema.safeParse(priced).success).toBe(false)
    expect(productSchema.safeParse({ ...priced, costPrice: null }).success).toBe(false)
    expect(productSchema.safeParse({ ...priced, costPrice: 0 }).success).toBe(false)
    expect(
      productSchema.safeParse({ ...priced, costPrice: 0, costPriceZeroReason: 'Promotional goods' })
        .success
    ).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: 75.5 }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: 19.99 }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: 0.29 }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: 10.5 }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: -0.01 }).success).toBe(false)
    expect(productSchema.safeParse({ ...priced, costPrice: 1.234 }).success).toBe(false)
  })

  it('accepts two-decimal costPrice values that fail Number.isInteger(value * 100)', () => {
    const priced = { ...base, price: 120 }
    expect(Number.isInteger(19.99 * 100)).toBe(false)
    expect(Number.isInteger(0.29 * 100)).toBe(false)

    for (const costPrice of [19.99, 0.29, 10.5]) {
      const parsed = productSchema.safeParse({ ...priced, costPrice })
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.costPrice).toBe(costPrice)
    }
  })
})
