import { describe, expect, it } from 'vitest'
import { productPutFields } from './product-put'
import { productSchema } from './validations'

const priced = {
  name: 'TIC TAC Fresh Mint',
  sku: '80052043',
  price: 120,
  quantity: 10,
  description: '',
  imageUrl: '',
  categoryId: null,
}

describe('productPutFields', () => {
  it('omits costPrice when the add-price form does not send one', () => {
    const validated = productSchema.parse(priced)
    expect(validated.costPrice).toBeUndefined()
    expect(productPutFields(validated)).not.toHaveProperty('costPrice')
    expect(productPutFields(validated).price).toBe(120)
  })

  it('writes an explicit null costPrice without inventing a selling price', () => {
    const validated = productSchema.parse({ ...priced, costPrice: null })
    expect(productPutFields(validated).costPrice).toBeNull()
  })

  it('rejects a selling price of 0 on the ProductForm update path', () => {
    expect(productSchema.safeParse({ ...priced, price: 0 }).success).toBe(false)
  })
})
