import { describe, expect, it } from 'vitest'
import { productPutFields } from './product-put'
import { productSchema } from './validations'

const priced = {
  name: 'TIC TAC Fresh Mint',
  sku: '80052043',
  price: 120,
  costPrice: 80,
  quantity: 10,
  description: '',
  imageUrl: '',
  categoryId: null,
}

describe('productPutFields', () => {
  it('writes the required purchase price and keeps the selling price', () => {
    const validated = productSchema.parse(priced)
    expect(validated.costPrice).toBe(80)
    expect(productPutFields(validated)).toMatchObject({
      price: 120,
      costPrice: 80,
      costPriceZeroReason: null,
    })
  })

  it('clears a leftover zero-reason when the purchase price is above 0', () => {
    const validated = productSchema.parse({
      ...priced,
      costPrice: 19.99,
      costPriceZeroReason: 'Gift/sample',
    })
    expect(productPutFields(validated).costPriceZeroReason).toBeNull()
  })

  it('stores the free-text zero-reason when purchase price is 0', () => {
    const validated = productSchema.parse({
      ...priced,
      costPrice: 0,
      costPriceZeroReason: 'Compensation',
    })
    expect(productPutFields(validated)).toMatchObject({
      costPrice: 0,
      costPriceZeroReason: 'Compensation',
    })
  })

  it('keeps a missing or zero selling price on the ProductForm update path', () => {
    expect(productSchema.safeParse({ ...priced, price: 0 }).success).toBe(true)
    const omitted = productSchema.parse({
      name: priced.name,
      sku: priced.sku,
      costPrice: priced.costPrice,
      quantity: priced.quantity,
    })
    expect(omitted.price).toBe(0)
    expect(productPutFields(omitted).price).toBe(0)
  })
})
