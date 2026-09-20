import { describe, expect, it } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
  calculateItemTotal,
  isWithinMoneyRange,
  MONEY_MAX,
  sumRoundedItemTotals,
  uniqueProductIds,
} from './invoice-totals'

describe('invoice totals (unit)', () => {
  it('rounds each item with ROUND_HALF_UP and sums rounded items', () => {
    const first = calculateItemTotal(1, new Decimal('1.005'), new Decimal(0))
    const second = calculateItemTotal(1, new Decimal('1.015'), new Decimal(0))

    expect(first.toString()).toBe('1.01')
    expect(second.toString()).toBe('1.02')
    expect(sumRoundedItemTotals([first, second]).toString()).toBe('2.03')
  })

  it('allows a 100% discount to produce a zero item total', () => {
    const total = calculateItemTotal(3, new Decimal('19.99'), new Decimal(100))
    expect(total.toString()).toBe('0')
    expect(isWithinMoneyRange(total)).toBe(true)
  })

  it('does not treat a value above Decimal(10,2) as in range', () => {
    expect(isWithinMoneyRange(MONEY_MAX)).toBe(true)
    expect(isWithinMoneyRange(MONEY_MAX.plus('0.01'))).toBe(false)
  })

  it('deduplicates product ids so the same product can appear on multiple lines', () => {
    expect(
      uniqueProductIds([
        { productId: 'prod-a' },
        { productId: null },
        { productId: 'prod-a' },
        { productId: 'prod-b' },
      ])
    ).toEqual(['prod-a', 'prod-b'])
  })
})
