import { describe, expect, it } from 'vitest'
import { buyerInvoicesHref, receivablesByBuyer } from './receivables-by-buyer'

const now = new Date('2026-10-20T10:00:00.000Z')
const row = (over: Partial<Parameters<typeof receivablesByBuyer>[0][number]>) => ({
  status: 'UNPAID',
  clientName: 'Kupac DOO',
  clientPib: null,
  totalAmount: '1000',
  dueDate: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
  ...over,
})

describe('receivablesByBuyer (ROADMAP A9.18)', () => {
  it('groups open invoices per PIB and per name without diacritics', () => {
    const result = receivablesByBuyer(
      [
        row({ clientName: 'Đorđević', totalAmount: '100' }),
        row({ clientName: 'djordjevic', totalAmount: '200' }),
        row({ clientName: 'Firma A', clientPib: '101134702', totalAmount: '300' }),
        row({ clientName: 'Firma A d.o.o.', clientPib: '101134702', totalAmount: '400', createdAt: '2026-10-05T10:00:00.000Z' }),
      ],
      now
    )
    expect(result.map((buyer) => [buyer.clientName, buyer.openTotal, buyer.openCount])).toEqual([
      ['Firma A d.o.o.', 700, 2],
      ['Đorđević', 300, 2],
    ])
  })

  it('leaves out paid invoices and predračuni', () => {
    const result = receivablesByBuyer(
      [row({ status: 'PAID' }), row({ documentType: 'PROFORMA' }), row({ totalAmount: '50' })],
      now
    )
    expect(result).toHaveLength(1)
    expect(result[0].openTotal).toBe(50)
  })

  it('puts the most late buyer first and sums what is already late', () => {
    const result = receivablesByBuyer(
      [
        row({ clientName: 'Velik ali ne kasni', totalAmount: '9000' }),
        row({ clientName: 'Kasni', totalAmount: '100', dueDate: '2026-10-10T00:00:00.000Z' }),
        row({ clientName: 'Kasni', totalAmount: '50', dueDate: '2026-10-30T00:00:00.000Z' }),
      ],
      now
    )
    expect(result[0]).toMatchObject({ clientName: 'Kasni', openTotal: 150, overdueTotal: 100, maxDaysOverdue: 10 })
    expect(result[0].oldestDueDate.toISOString()).toBe('2026-10-10T00:00:00.000Z')
    expect(result[1]).toMatchObject({ clientName: 'Velik ali ne kasni', overdueTotal: 0, maxDaysOverdue: 0 })
  })

  it('links to the buyer invoices by PIB, else by name', () => {
    expect(buyerInvoicesHref({ clientName: 'Firma A', clientPib: '101134702' })).toBe('/invoices?q=101134702')
    expect(buyerInvoicesHref({ clientName: 'Kupac DOO', clientPib: null })).toBe('/invoices?q=Kupac+DOO')
  })
})
