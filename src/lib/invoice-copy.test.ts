import { describe, expect, it } from 'vitest'
import { invoiceCopyHref, invoiceCopyPrefill, type CopySource } from './invoice-copy'
import { DEFAULT_VAT_RATE } from './invoice-vat'

const products = [
  { id: 'old', sku: 'A', name: 'Šampon 250ml', price: '300.00', quantity: 2, createdAt: '2026-01-01' },
  { id: 'new', sku: 'A', name: 'Šampon 250 ml', price: '350.00', quantity: 3, createdAt: '2026-06-01' },
  { id: 'noprice', sku: 'B', name: 'Krema', price: '0', quantity: 1, createdAt: '2026-02-01' },
]

const source: CopySource = {
  clientName: 'Kupac d.o.o.',
  clientAddress: null,
  clientPib: '123456789',
  vatEnabled: true,
  items: [
    { productId: 'old', productName: 'Šampon', quantity: 4, unitPrice: '280.00', discount: '5', vatRate: '10' },
    { productId: 'noprice', productName: 'Krema', quantity: 1, unitPrice: '120.50', discount: '0', vatRate: '20' },
    { productId: 'deleted', productName: 'Stari artikal', quantity: 2, unitPrice: '99.99', discount: '0', vatRate: '20' },
    { productId: null, productName: 'Prevoz', quantity: 1, unitPrice: '500', discount: '0', vatRate: '20' },
  ],
}

describe('invoiceCopyPrefill', () => {
  it('copies the buyer and quantities, empty strings for missing fields', () => {
    const copy = invoiceCopyPrefill(source, products, true)
    expect(copy).toMatchObject({ clientName: 'Kupac d.o.o.', clientAddress: '', clientPib: '123456789' })
    expect(copy.items.map((item) => item.quantity)).toEqual([4, 1, 2, 1])
  })

  it("uses today's product row, name and sale price; keeps discount and PDV rate", () => {
    const [line] = invoiceCopyPrefill(source, products, true).items
    expect(line).toEqual({
      productId: 'new',
      productName: 'Šampon 250 ml',
      quantity: 4,
      unitPrice: 350,
      discount: 5,
      vatRate: 10,
    })
  })

  it('keeps the old price when the product has no sale price, and old text for a missing product', () => {
    const [, noPrice, deleted, service] = invoiceCopyPrefill(source, products, true).items
    expect(noPrice).toMatchObject({ productId: 'noprice', unitPrice: 120.5 })
    expect(deleted).toMatchObject({ productId: null, productName: 'Stari artikal', unitPrice: 99.99 })
    expect(service).toMatchObject({ productId: null, productName: 'Prevoz', unitPrice: 500 })
  })

  it('follows the company PDV setting of today', () => {
    expect(invoiceCopyPrefill(source, products, false).items.every((item) => item.vatRate === 0)).toBe(true)
    const fromNonVat = invoiceCopyPrefill({ ...source, vatEnabled: false }, products, true)
    expect(fromNonVat.items.every((item) => item.vatRate === DEFAULT_VAT_RATE)).toBe(true)
  })
})

describe('invoiceCopyHref', () => {
  it('keeps the document type of the source', () => {
    expect(invoiceCopyHref({ id: 'inv1', documentType: 'INVOICE' })).toBe('/invoices/new?copyFrom=inv1')
    expect(invoiceCopyHref({ id: 'pr1', documentType: 'PROFORMA' })).toBe('/invoices/new?copyFrom=pr1&type=proforma')
  })
})
