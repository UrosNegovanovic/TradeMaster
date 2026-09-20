import { describe, expect, it } from 'vitest'
import { invoicePatchSchema, invoiceWriteSchema } from './validations'

const validItem = {
  productId: 'prod-1',
  productName: 'Coffee',
  quantity: 2,
  unitPrice: 10.5,
  discount: 0,
}

const validInvoice = {
  invoiceNumber: '2026-001',
  dueDate: '2026-10-01',
  clientName: 'Acme',
  items: [validItem],
}

describe('invoiceWriteSchema (unit)', () => {
  it('accepts a valid payload and ignores client totals', () => {
    const result = invoiceWriteSchema.safeParse({
      ...validInvoice,
      totalAmount: 1,
      items: [{ ...validItem, total: 1 }],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect('total' in result.data.items[0]).toBe(false)
      expect(result.data.status).toBeUndefined()
    }
  })

  it('accepts a repeated product id on multiple lines', () => {
    const result = invoiceWriteSchema.safeParse({
      ...validInvoice,
      items: [validItem, { ...validItem, quantity: 1 }],
    })

    expect(result.success).toBe(true)
  })

  it('accepts a manual item without productId', () => {
    const result = invoiceWriteSchema.safeParse({
      ...validInvoice,
      items: [{ ...validItem, productId: null, productName: 'Custom line' }],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a form payload that contains one invalid row instead of dropping it', () => {
    const result = invoiceWriteSchema.safeParse({
      ...validInvoice,
      items: [validItem, { productId: null, productName: '', quantity: 1, unitPrice: 0, discount: 0 }],
    })

    expect(result.success).toBe(false)
  })

  it('accepts unitPrice of 0 for free/sample line items', () => {
    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, unitPrice: 0 }],
      }).success
    ).toBe(true)
  })

  it('rejects negative unitPrice and more than 2 decimal places', () => {
    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, unitPrice: -1 }],
      }).success
    ).toBe(false)

    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, unitPrice: 1.234 }],
      }).success
    ).toBe(false)
  })

  it('rejects quantity that is not a positive integer in range', () => {
    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, quantity: 1.5 }],
      }).success
    ).toBe(false)

    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, quantity: 0 }],
      }).success
    ).toBe(false)

    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, quantity: 2147483648 }],
      }).success
    ).toBe(false)
  })

  it('rejects discount outside 0-100 or with extra precision', () => {
    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, discount: -1 }],
      }).success
    ).toBe(false)

    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, discount: 100.01 }],
      }).success
    ).toBe(false)

    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        items: [{ ...validItem, discount: 10.123 }],
      }).success
    ).toBe(false)
  })

  it('accepts discount 100 and an explicit valid status without requiring it', () => {
    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        status: 'PAID',
        items: [{ ...validItem, discount: 100 }],
      }).success
    ).toBe(true)
  })

  it('rejects an invalid status or date', () => {
    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        status: 'CANCELLED',
      }).success
    ).toBe(false)

    expect(
      invoiceWriteSchema.safeParse({
        ...validInvoice,
        dueDate: 'not-a-date',
      }).success
    ).toBe(false)
  })
})

describe('invoicePatchSchema (unit)', () => {
  it('accepts a supported status change', () => {
    expect(invoicePatchSchema.safeParse({ status: 'UNPAID' }).success).toBe(true)
  })

  it('rejects an empty body and an invalid status', () => {
    expect(invoicePatchSchema.safeParse({}).success).toBe(false)
    expect(invoicePatchSchema.safeParse({ status: 'CANCELLED' }).success).toBe(false)
  })
})
