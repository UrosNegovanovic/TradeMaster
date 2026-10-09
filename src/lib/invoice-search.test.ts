import { describe, expect, it } from 'vitest'
import { foldSerbian, matchesInvoiceQuery, sortByDueDate } from './invoice-search'

const invoice = { invoiceNumber: '12/2026', clientName: 'Đorđević Trade DOO Čačak', clientPib: '101134702' }

describe('matchesInvoiceQuery', () => {
  it('finds by number, buyer name or PIB', () => {
    expect(matchesInvoiceQuery(invoice, '12/2026')).toBe(true)
    expect(matchesInvoiceQuery(invoice, 'trade')).toBe(true)
    expect(matchesInvoiceQuery(invoice, '101134')).toBe(true)
    expect(matchesInvoiceQuery(invoice, 'nema')).toBe(false)
  })

  it('ignores case and Serbian diacritics, and needs every word', () => {
    expect(matchesInvoiceQuery(invoice, 'djordjevic cacak')).toBe(true)
    expect(matchesInvoiceQuery(invoice, 'ĐORĐEVIĆ')).toBe(true)
    expect(matchesInvoiceQuery(invoice, 'djordjevic beograd')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesInvoiceQuery(invoice, '   ')).toBe(true)
  })

  it('folds đ to dj like people type it', () => {
    expect(foldSerbian(' Đurđevak ')).toBe('djurdjevak')
  })
})

describe('sortByDueDate', () => {
  it('puts the earliest due first and the newest first on the same day', () => {
    const rows = [
      { id: 'late', dueDate: '2026-11-30', createdAt: '2026-10-01T10:00:00Z' },
      { id: 'soon-old', dueDate: '2026-10-15', createdAt: '2026-09-01T10:00:00Z' },
      { id: 'soon-new', dueDate: '2026-10-15', createdAt: '2026-09-20T10:00:00Z' },
    ]
    expect(sortByDueDate(rows).map((row) => row.id)).toEqual(['soon-new', 'soon-old', 'late'])
  })
})
