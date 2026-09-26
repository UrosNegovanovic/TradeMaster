import { describe, expect, it } from 'vitest'
import { currentMonthKey, groupInvoicesByMonth } from './invoice-archive'
import { Invoice, InvoiceStatus } from '@/types/invoice'

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'id',
    invoiceNumber: '2026-001',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    dueDate: new Date('2026-10-01T00:00:00.000Z'),
    clientName: 'Klijent',
    clientAddress: null,
    status: InvoiceStatus.PAID,
    totalAmount: '100' as unknown as Invoice['totalAmount'],
    paidAt: null,
    profileId: 'profile',
    ...overrides,
  }
}

describe('groupInvoicesByMonth', () => {
  it('groups invoices by the month they were paid in, newest first', () => {
    const invoices = [
      makeInvoice({ id: 'a', paidAt: new Date('2026-07-15T00:00:00.000Z'), totalAmount: '100' as unknown as Invoice['totalAmount'] }),
      makeInvoice({ id: 'b', paidAt: new Date('2026-09-10T00:00:00.000Z'), totalAmount: '50' as unknown as Invoice['totalAmount'] }),
      makeInvoice({ id: 'c', paidAt: new Date('2026-09-20T00:00:00.000Z'), totalAmount: '25' as unknown as Invoice['totalAmount'] }),
    ]

    const groups = groupInvoicesByMonth(invoices)

    expect(groups.map((g) => g.key)).toEqual(['2026-09', '2026-07'])
    expect(groups[0].invoices.map((i) => i.id)).toEqual(['b', 'c'])
    expect(groups[0].total).toBe(75)
    expect(groups[0].label).toBe('Septembar 2026.')
  })

  it('falls back to createdAt when an invoice has no paidAt', () => {
    const invoices = [
      makeInvoice({ id: 'open', paidAt: null, createdAt: new Date('2026-08-05T00:00:00.000Z') }),
    ]

    const groups = groupInvoicesByMonth(invoices)

    expect(groups[0].key).toBe('2026-08')
  })
})

describe('currentMonthKey', () => {
  it('formats as YYYY-MM', () => {
    expect(currentMonthKey(new Date('2026-01-05T00:00:00.000Z'))).toBe('2026-01')
  })
})
