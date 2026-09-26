import { describe, expect, it } from 'vitest'
import { nextInvoiceNumber } from './invoice-number'

describe('nextInvoiceNumber', () => {
  it('starts a company year at YYYY-001', () => {
    expect(nextInvoiceNumber(2026, [])).toBe('2026-001')
  })

  it('increments the highest valid sequence and ignores manual legacy labels', () => {
    expect(nextInvoiceNumber(2026, ['2026-002', 'Test2026-11', '2025-999', '2026-010'])).toBe(
      '2026-011'
    )
  })
})
