import { describe, expect, it } from 'vitest'
import { aggregateLowStock } from './low-stock'

function product(
  partial: Partial<{
    id: string
    name: string
    sku: string
    quantity: number
    minStock: number
    price: number
    createdAt: Date
  }>
) {
  return {
    id: partial.id ?? 'p1',
    name: partial.name ?? 'Xixo',
    sku: partial.sku ?? '5999885747054',
    quantity: partial.quantity ?? 0,
    minStock: partial.minStock ?? 2,
    price: partial.price ?? 100,
    imageUrl: null,
    createdAt: partial.createdAt ?? new Date('2026-09-23T10:00:00'),
  }
}

describe('aggregateLowStock', () => {
  it('flags a SKU when the summed daily batches are at or below minStock', () => {
    const rows = aggregateLowStock([
      product({ id: 'old', quantity: 1, minStock: 2, createdAt: new Date('2026-09-21T10:00:00') }),
      product({ id: 'new', quantity: 1, minStock: 3, createdAt: new Date('2026-09-23T10:00:00') }),
    ])

    expect(rows).toEqual([
      {
        id: 'new',
        name: 'Xixo',
        sku: '5999885747054',
        quantity: 2,
        minStock: 3,
        imageUrl: null,
        missingPrice: false,
      },
    ])
  })

  it('keeps SKUs above the latest minStock off the list', () => {
    expect(
      aggregateLowStock([
        product({ quantity: 4, minStock: 2 }),
        product({ id: 'other', sku: '111', name: 'Voda', quantity: 5, minStock: 2 }),
      ])
    ).toEqual([])
  })

  it('sorts the most empty SKUs first, then by name', () => {
    const rows = aggregateLowStock([
      product({ id: 'b', name: 'Banana', sku: 'b', quantity: 0, minStock: 2 }),
      product({ id: 'a', name: 'Ananas', sku: 'a', quantity: 0, minStock: 2 }),
      product({ id: 'c', name: 'Cedevita', sku: 'c', quantity: 1, minStock: 2 }),
    ])

    expect(rows.map((row) => row.name)).toEqual(['Ananas', 'Banana', 'Cedevita'])
  })

  it('marks a low-stock SKU whose latest row has no price', () => {
    const rows = aggregateLowStock([
      product({ id: 'old', quantity: 1, price: 100, createdAt: new Date('2026-09-22T10:00:00') }),
      product({ id: 'new', quantity: 0, price: 0, createdAt: new Date('2026-09-23T10:00:00') }),
    ])

    expect(rows[0]).toMatchObject({ id: 'new', missingPrice: true })
  })
})
