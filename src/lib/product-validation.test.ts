import { describe, expect, it } from 'vitest'
import { productSchema } from './validations'

describe('productSchema price', () => {
  it('requires a positive selling price for product creation and editing', () => {
    const base = { name: 'Sok', sku: '8600000000001', quantity: 1 }

    expect(productSchema.safeParse({ ...base, price: 0 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: -1 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: 0.01 }).success).toBe(true)
  })

  it('accepts an omitted or non-negative cost price and rejects invalid cost', () => {
    const base = { name: 'Sok', sku: '8600000000001', price: 120, quantity: 1 }

    expect(productSchema.safeParse(base).success).toBe(true)
    expect(productSchema.safeParse({ ...base, costPrice: null }).success).toBe(true)
    expect(productSchema.safeParse({ ...base, costPrice: 0 }).success).toBe(true)
    expect(productSchema.safeParse({ ...base, costPrice: 75.5 }).success).toBe(true)
    expect(productSchema.safeParse({ ...base, costPrice: -0.01 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, costPrice: 1.234 }).success).toBe(false)
  })
})
