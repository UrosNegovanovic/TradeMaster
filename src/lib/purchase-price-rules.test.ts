import { describe, expect, it } from 'vitest'
import { invoiceProfit, marginPercent, totalProfit, unitProfit } from './invoice-finance'
import { productPutFields } from './product-put'
import { invoiceItemWriteSchema, invoiceWriteSchema, productIntakeSchema, productSchema } from './validations'

const product = { name: 'Sok', sku: '8600000000001', quantity: 1, price: 120 }

describe('purchase price rules (12 spec cases)', () => {
  it('1. ProductForm rejects a missing purchase price', () => {
    const parsed = productSchema.safeParse(product)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.includes('costPrice'))).toBe(true)
    }
  })

  it('2. ProductForm rejects a negative purchase price', () => {
    expect(productSchema.safeParse({ ...product, costPrice: -0.01 }).success).toBe(false)
  })

  it('3. ProductForm rejects a purchase price with more than 2 decimals', () => {
    expect(productSchema.safeParse({ ...product, costPrice: 1.234 }).success).toBe(false)
  })

  it('4. ProductForm accepts a purchase price > 0 without a note', () => {
    const parsed = productSchema.parse({ ...product, costPrice: 75.5 })
    expect(parsed.costPrice).toBe(75.5)
    expect(parsed.costPriceZeroReason).toBeNull()
  })

  it('5. Zero purchase price is rejected without a note', () => {
    const parsed = productSchema.safeParse({ ...product, costPrice: 0 })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.includes('costPriceZeroReason'))).toBe(
        true
      )
    }
  })

  it('6. Zero purchase price is rejected when the note is only whitespace', () => {
    expect(
      productSchema.safeParse({ ...product, costPrice: 0, costPriceZeroReason: '   ' }).success
    ).toBe(false)
  })

  it('7. Zero purchase price is accepted with a free-text note (not an enum)', () => {
    const parsed = productSchema.parse({
      ...product,
      costPrice: 0,
      costPriceZeroReason: 'Gift/sample from supplier',
    })
    expect(parsed.costPrice).toBe(0)
    expect(parsed.costPriceZeroReason).toBe('Gift/sample from supplier')
  })

  it('8. The zero-reason is cleared when purchase price goes from 0 to > 0', () => {
    const zero = productSchema.parse({
      ...product,
      costPrice: 0,
      costPriceZeroReason: 'Initial inventory',
    })
    const raised = productSchema.parse({
      ...product,
      costPrice: 19.99,
      costPriceZeroReason: zero.costPriceZeroReason,
    })
    expect(raised.costPrice).toBe(19.99)
    expect(raised.costPriceZeroReason).toBeNull()
    expect(productPutFields(raised).costPriceZeroReason).toBeNull()
  })

  it('9. Product sale price is optional; invoice item sale price stays required', () => {
    expect(productSchema.safeParse({ ...product, price: 0, costPrice: 10 }).success).toBe(true)
    expect(productSchema.safeParse({ name: product.name, sku: product.sku, quantity: 1, costPrice: 10 }).success).toBe(
      true
    )
    expect(productSchema.safeParse({ ...product, price: 0.01, costPrice: 10 }).success).toBe(true)

    expect(invoiceItemWriteSchema.safeParse({ productName: 'Sok', quantity: 1 }).success).toBe(false)
    expect(
      invoiceItemWriteSchema.safeParse({
        productName: 'Sok',
        quantity: 1,
        unitPrice: 120,
      }).success
    ).toBe(true)
  })

  it('10. Invoice create payload snapshots sale price and qty; purchase is snapshotted as unitCost at write time', () => {
    const parsed = invoiceWriteSchema.parse({
      invoiceNumber: '2026-100',
      dueDate: '2026-10-01',
      clientName: 'Acme',
      items: [
        {
          productId: 'product-a',
          productName: 'Sok',
          quantity: 3,
          unitPrice: 99,
          discount: 0,
        },
      ],
    })

    expect(parsed.items[0]).toMatchObject({ quantity: 3, unitPrice: 99 })
    expect(parsed.items[0]).not.toHaveProperty('unitCost')
  })

  it('11. Historical profit uses invoice item snapshots, not current Product prices', () => {
    const currentProduct = { price: 999, costPrice: 1 }
    const invoice = invoiceProfit({
      id: 'hist',
      invoiceNumber: '2026-100',
      clientName: 'Acme',
      status: 'PAID',
      totalAmount: 300,
      createdAt: new Date('2026-09-01'),
      items: [{ quantity: 3, unitCost: 50 }],
    })

    expect(invoice.costTotal).toBe(150)
    expect(invoice.profit).toBe(150)
    expect(invoice.marginPercent).toBe(50)
    expect(invoice.costTotal).not.toBe(3 * currentProduct.costPrice)
    expect(invoice.profit).not.toBe(3 * (currentProduct.price - currentProduct.costPrice))
  })

  it('12. Shared finance helpers compute unitProfit, totalProfit, and marginPercent from snapshots', () => {
    expect(unitProfit(120, 80)).toBe(40)
    expect(totalProfit(3, 120, 80)).toBe(120)
    expect(marginPercent(40, 120)).toBe(33.33)
    expect(marginPercent(10, 0)).toBeNull()
    expect(productIntakeSchema.safeParse({ ...product, price: 0 }).success).toBe(true)
  })
})
