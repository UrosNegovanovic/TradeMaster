import { describe, expect, it } from 'vitest'
import { pickerProductForId, productsForPicker } from './product-picker'

const airwaves = {
  name: 'Airwaves Blackjack',
  sku: '4009900550178',
}

describe('productsForPicker', () => {
  it('collapses daily batches of the same SKU into one row with Magacin total', () => {
    const rows = productsForPicker([
      { id: 'today', ...airwaves, quantity: 6, createdAt: '2026-09-23T10:00:00.000Z' },
      { id: 'batch-78', ...airwaves, quantity: 78, createdAt: '2026-09-22T10:00:00.000Z' },
      { id: 'batch-5', ...airwaves, quantity: 5, createdAt: '2026-09-21T10:00:00.000Z' },
      { id: 'batch-13', ...airwaves, quantity: 13, createdAt: '2026-09-20T10:00:00.000Z' },
      { id: 'other', name: 'Xixo', sku: '5999885747054', quantity: 4, createdAt: '2026-09-23T09:00:00.000Z' },
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: 'today', sku: airwaves.sku, quantity: 102 })
    expect(rows[1]).toMatchObject({ id: 'other', sku: '5999885747054', quantity: 4 })
  })

  it('keeps the newest batch id when createdAt ties', () => {
    const rows = productsForPicker([
      { id: 'a', sku: 'SKU', quantity: 1, createdAt: '2026-09-23T10:00:00.000Z' },
      { id: 'b', sku: 'SKU', quantity: 2, createdAt: '2026-09-23T10:00:00.000Z' },
    ])

    expect(rows).toEqual([{ id: 'b', sku: 'SKU', quantity: 3, createdAt: '2026-09-23T10:00:00.000Z' }])
  })
})

describe('pickerProductForId', () => {
  const products = [
    { id: 'today', ...airwaves, quantity: 6, createdAt: '2026-09-23T10:00:00.000Z' },
    { id: 'older', ...airwaves, quantity: 13, createdAt: '2026-09-20T10:00:00.000Z' },
  ]

  it('maps an older batch id to the aggregated SKU row', () => {
    expect(pickerProductForId(products, 'older')).toMatchObject({
      id: 'today',
      sku: airwaves.sku,
      quantity: 19,
    })
  })

  it('returns undefined when the id is missing', () => {
    expect(pickerProductForId(products, null)).toBeUndefined()
    expect(pickerProductForId(products, 'missing')).toBeUndefined()
  })
})
