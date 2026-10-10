import { describe, expect, it } from 'vitest'
import { applyInventoryView, inventoryFilterCounts, parseInventoryFilter } from './inventory-view'

const rows = [
  { id: 'a', sku: 'A', name: 'Šećer', quantity: 1, minStock: 2, price: '120', costPrice: '80', createdAt: '2026-10-01' },
  // Quick Scan: no purchase price, no sale price.
  { id: 'b', sku: 'B', name: 'Brašno', quantity: 9, minStock: 2, price: '0', costPrice: null, createdAt: '2026-10-02' },
  // Two daily batches of one SKU: 3 + 4 = 7 in stock, threshold 10 on both rows.
  { id: 'c1', sku: 'C', name: 'Čaj', quantity: 3, minStock: 10, price: '50', costPrice: '0', createdAt: '2026-09-01' },
  { id: 'c2', sku: 'C', name: 'Čaj', quantity: 4, minStock: 10, price: '55', costPrice: '30', createdAt: '2026-10-03' },
]

describe('inventory view (ROADMAP A9.14)', () => {
  it('counts what needs completing; a purchase price of 0 is not missing', () => {
    expect(inventoryFilterCounts(rows)).toEqual({ all: 4, 'missing-cost': 1, 'missing-price': 1, 'low-stock': 3 })
  })

  it('filters', () => {
    expect(applyInventoryView(rows, 'missing-cost', 'newest').map((row) => row.id)).toEqual(['b'])
    expect(applyInventoryView(rows, 'missing-price', 'newest').map((row) => row.id)).toEqual(['b'])
    // Low stock by SKU total, like Magacin: A (1 ≤ 2) and both C rows (7 ≤ 10).
    expect(applyInventoryView(rows, 'low-stock', 'newest').map((row) => row.id)).toEqual(['a', 'c1', 'c2'])
  })

  it('sorts by name (Serbian alphabet), stock and price; newest keeps the list order', () => {
    expect(applyInventoryView(rows, 'all', 'newest').map((row) => row.id)).toEqual(['a', 'b', 'c1', 'c2'])
    expect(applyInventoryView(rows, 'all', 'name').map((row) => row.name)).toEqual(['Brašno', 'Čaj', 'Čaj', 'Šećer'])
    expect(applyInventoryView(rows, 'all', 'stock-asc').map((row) => row.id)[0]).toBe('a')
    expect(applyInventoryView(rows, 'all', 'stock-desc').map((row) => row.id)[0]).toBe('b')
    expect(applyInventoryView(rows, 'all', 'price-desc').map((row) => row.id)[0]).toBe('a')
  })

  it('reads the filter from the address safely', () => {
    expect(parseInventoryFilter('missing-cost')).toBe('missing-cost')
    expect(parseInventoryFilter('drop table')).toBe('all')
    expect(parseInventoryFilter(null)).toBe('all')
  })
})
