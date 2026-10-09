import { describe, expect, it } from 'vitest'
import { catalogProformaHref, proformaFromCatalogPrefill } from './catalog-proforma'

const products = [
  { id: 'old-kafa', sku: 'K1', quantity: 2, createdAt: '2026-01-01', name: 'Kafa (stari naziv)', price: '90' },
  { id: 'new-kafa', sku: 'K1', quantity: 3, createdAt: '2026-09-01', name: 'Kafa 200g', price: '100' },
  { id: 'caj', sku: 'C1', quantity: 5, createdAt: '2026-09-01', name: 'Čaj', price: '0' },
]

const catalog = {
  clientName: 'Kupac DOO',
  discount: '15.00',
  items: [
    { productId: 'caj', product: { name: 'Čaj', price: '0' } },
    { productId: 'old-kafa', product: { name: 'Kafa (stari naziv)', price: '90' } },
  ],
}

describe('proformaFromCatalogPrefill (ROADMAP A9.15)', () => {
  it('keeps the catalog order, 1 piece, today price of the newest SKU row and the catalog discount', () => {
    const prefill = proformaFromCatalogPrefill(catalog, products, [], true)
    expect(prefill.items).toEqual([
      { productId: 'caj', productName: 'Čaj', quantity: 1, unitPrice: 0, discount: 15, vatRate: 20 },
      { productId: 'new-kafa', productName: 'Kafa 200g', quantity: 1, unitPrice: 100, discount: 15, vatRate: 20 },
    ])
  })

  it('fills PIB and address from a saved buyer with the same name', () => {
    const clients = [{ name: 'kupac doo', pib: '101134702', address: 'Ulica 1, 11000 Beograd' }]
    const prefill = proformaFromCatalogPrefill(catalog, products, clients, false)
    expect(prefill).toMatchObject({ clientName: 'kupac doo', clientPib: '101134702', clientAddress: 'Ulica 1, 11000 Beograd' })
    expect(prefill.items[0].vatRate).toBe(0)
  })

  it('works for a catalog without buyer and skips lines with no product left', () => {
    const prefill = proformaFromCatalogPrefill(
      { clientName: null, discount: 0, items: [{ productId: 'gone', product: null }] },
      products,
      [],
      false
    )
    expect(prefill).toEqual({ clientName: '', clientPib: '', clientAddress: '', items: [] })
  })

  it('links to a new predračun', () => {
    expect(catalogProformaHref('cat1')).toBe('/invoices/new?type=proforma&fromCatalog=cat1')
  })
})
