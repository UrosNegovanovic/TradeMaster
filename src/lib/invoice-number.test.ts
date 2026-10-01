import { describe, expect, it } from 'vitest'
import { nextInvoiceNumber } from './invoice-number'

describe('nextInvoiceNumber', () => {
  it('starts a company year at 01/YYYY when there are no existing invoices', () => {
    expect(nextInvoiceNumber(2026, [])).toBe('01/2026')
  })

  it('continues the existing NN/YYYY sequence instead of resetting it', () => {
    expect(nextInvoiceNumber(2026, ['01/2026', '02/2026', '04/2026', '06/2026'])).toBe('07/2026')
  })

  it('ignores malformed or legacy labels that do not match NN/YYYY', () => {
    expect(nextInvoiceNumber(2026, ['02/2026', 'Test2026-11', '999/2025', '10/2026'])).toBe(
      '11/2026'
    )
  })

  it('scopes the sequence to the given year and ignores other years', () => {
    expect(nextInvoiceNumber(2026, ['05/2025', '99/2025'])).toBe('01/2026')
  })
})
