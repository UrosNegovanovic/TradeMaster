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
    expect(productSchema.safeParse({ ...base, price: 0 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: -1 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: 0.01 }).success).toBe(true)
  })

  it('accepts an omitted or non-negative cost price and rejects invalid cost', () => {
    const priced = { ...base, price: 120 }

    expect(productSchema.safeParse(priced).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: null }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: 0 }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: 75.5 }).success).toBe(true)
    expect(productSchema.safeParse({ ...priced, costPrice: -0.01 }).success).toBe(false)
    expect(productSchema.safeParse({ ...priced, costPrice: 1.234 }).success).toBe(false)
  })
})
