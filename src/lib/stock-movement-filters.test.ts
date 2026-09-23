import { describe, expect, it } from 'vitest'
import { MovementType } from '@prisma/client'
import { StockMovement } from '@/types/warehouse'
import { filterStockMovements } from './stock-movement-filters'

function movement(overrides: Partial<StockMovement> & { name?: string; sku?: string }): StockMovement {
  const { name = 'Xixo ice tea', sku = '5999885747054', ...rest } = overrides
  return {
    id: rest.id ?? 'm1',
    type: rest.type ?? MovementType.IN,
    quantity: rest.quantity ?? 1,
    reason: rest.reason ?? 'Ulaz robe',
    createdAt: rest.createdAt ?? new Date('2026-09-23T16:26:00'),
    profileId: rest.profileId ?? 'prof',
    productId: rest.productId ?? 'p1',
    product: rest.product ?? { id: 'p1', name, sku },
  }
}

describe('filterStockMovements', () => {
  const rows = [
    movement({
      id: 'in-tea',
      name: 'Xixo ice tea lemon 250ml',
      sku: '5999885747054',
      createdAt: new Date('2026-09-23T16:26:00'),
    }),
    movement({
      id: 'out-cig',
      type: MovementType.OUT,
      name: 'Cigarette - Do NOT smoke cigarettes',
      sku: '403004455',
      createdAt: new Date('2026-09-23T16:19:00'),
    }),
    movement({
      id: 'in-old',
      name: 'Xixo ice tea lemon 250ml',
      sku: '5999885747054',
      createdAt: new Date('2026-09-21T10:00:00'),
    }),
  ]

  it('returns every row when no filters are set', () => {
    expect(filterStockMovements(rows, '')).toHaveLength(3)
  })

  it('matches product name or SKU', () => {
    expect(filterStockMovements(rows, 'cigarette').map((row) => row.id)).toEqual(['out-cig'])
    expect(filterStockMovements(rows, '599988').map((row) => row.id)).toEqual(['in-tea', 'in-old'])
  })

  it('keeps only movements on the selected local day', () => {
    const filtered = filterStockMovements(rows, '', new Date(2026, 8, 23))
    expect(filtered.map((row) => row.id)).toEqual(['in-tea', 'out-cig'])
  })

  it('applies search and date together', () => {
    const filtered = filterStockMovements(rows, 'xixo', new Date(2026, 8, 23))
    expect(filtered.map((row) => row.id)).toEqual(['in-tea'])
  })
})
