import { describe, expect, it } from 'vitest'
import { parseStockMovementListParams } from './stock-movement-query'

describe('parseStockMovementListParams', () => {
  it('defaults to the warehouse preview limit of 50', () => {
    expect(parseStockMovementListParams(new URLSearchParams())).toEqual({ take: 50 })
  })

  it('caps a numeric limit at 100', () => {
    expect(parseStockMovementListParams(new URLSearchParams('limit=500'))).toEqual({
      take: 100,
    })
  })

  it('drops take when all movements are requested', () => {
    expect(parseStockMovementListParams(new URLSearchParams('all=1'))).toEqual({})
    expect(parseStockMovementListParams(new URLSearchParams('limit=all'))).toEqual({})
  })

  it('keeps an optional productId on both preview and all queries', () => {
    expect(parseStockMovementListParams(new URLSearchParams('productId=p1&limit=20'))).toEqual({
      take: 20,
      productId: 'p1',
    })
    expect(parseStockMovementListParams(new URLSearchParams('productId=p1&all=1'))).toEqual({
      productId: 'p1',
    })
  })
})
