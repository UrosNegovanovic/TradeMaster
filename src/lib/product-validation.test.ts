import { describe, expect, it } from 'vitest'
import { productSchema } from './validations'

describe('productSchema price', () => {
  it('requires a positive selling price for product creation and editing', () => {
    const base = { name: 'Sok', sku: '8600000000001', quantity: 1 }

    expect(productSchema.safeParse({ ...base, price: 0 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: -1 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price: 0.01 }).success).toBe(true)
  })
})
