import { describe, expect, it } from 'vitest'
import {
  addReservedStock,
  clampDiscountPercent,
  lineDiscountAmount,
  lineSubtotal,
  lineTotal,
  remainingStock,
  stockBySku,
} from './invoice-line'

describe('invoice line discount', () => {
  it('applies discount as a percent of quantity × unit price, not as RSD', () => {
    expect(lineSubtotal(3, 50)).toBe(150)
    expect(lineTotal(3, 50, 10)).toBe(135)
    expect(lineDiscountAmount(3, 50, 10)).toBe(15)
  })

  it('matches 10% and 10 RSD only when the subtotal is 100', () => {
    expect(lineTotal(2, 50, 10)).toBe(90)
    expect(lineTotal(2, 50, 10)).not.toBe(80)
  })

  it('clamps percent to 0–100', () => {
    expect(clampDiscountPercent(-5)).toBe(0)
    expect(clampDiscountPercent(150)).toBe(100)
    expect(lineTotal(2, 40, 100)).toBe(0)
  })
})

describe('invoice line stock', () => {
  it('sums quantities for the same SKU across daily batches', () => {
    const map = stockBySku([
      { sku: 'ABC', quantity: 2 },
      { sku: 'ABC', quantity: 5 },
      { sku: 'XYZ', quantity: 1 },
    ])
    expect(map.get('ABC')).toBe(7)
  })

  it('subtracts other invoice lines of the same SKU from available stock', () => {
    const available = remainingStock({
      sku: 'ABC',
      lineId: 'line-2',
      stockBySku: new Map([['ABC', 7]]),
      lines: [
        { id: 'line-1', sku: 'ABC', quantity: 3 },
        { id: 'line-2', sku: 'ABC', quantity: 10 },
      ],
    })
    expect(available).toBe(4)
  })

  it('adds this invoice reserved stock back when editing an already issued invoice', () => {
    const map = addReservedStock(new Map([['ABC', 4]]), [
      { sku: 'ABC', quantity: 3 },
      { sku: null, quantity: 2 },
    ])
    expect(map.get('ABC')).toBe(7)
    expect(
      remainingStock({
        sku: 'ABC',
        lineId: 'line-1',
        stockBySku: map,
        lines: [{ id: 'line-1', sku: 'ABC', quantity: 3 }],
      })
    ).toBe(7)
  })
})
