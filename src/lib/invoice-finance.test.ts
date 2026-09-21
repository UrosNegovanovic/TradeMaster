import { describe, expect, it } from 'vitest'
import {
  buildFinanceSnapshot,
  formatRsd,
  nextPaidAt,
  paymentDate,
  sumInvoiceAmounts,
} from './invoice-finance'

const now = new Date(2026, 8, 21, 10, 0, 0)

function invoice(partial: {
  id: string
  status: string
  totalAmount: number
  createdAt?: Date
  paidAt?: Date | null
}) {
  return {
    id: partial.id,
    invoiceNumber: partial.id,
    clientName: 'Klijent',
    status: partial.status,
    totalAmount: partial.totalAmount,
    createdAt: partial.createdAt ?? new Date(2026, 7, 1),
    paidAt: partial.paidAt,
  }
}

describe('invoice-finance', () => {
  it('treats marking paid as a transfer from receivables to payment-month revenue', () => {
    const open = [
      invoice({ id: 'a', status: 'UNPAID', totalAmount: 100 }),
      invoice({ id: 'b', status: 'DRAFT', totalAmount: 40 }),
    ]
    const before = buildFinanceSnapshot(open, now)
    expect(before.receivables).toBe(140)
    expect(before.monthRevenue).toBe(0)

    const afterPay = buildFinanceSnapshot(
      [
        invoice({ id: 'a', status: 'PAID', totalAmount: 100, paidAt: now }),
        invoice({ id: 'b', status: 'DRAFT', totalAmount: 40 }),
      ],
      now
    )
    expect(afterPay.receivables).toBe(40)
    expect(afterPay.monthRevenue).toBe(100)
    expect(afterPay.allTimePaid).toBe(100)
  })

  it('books revenue in the paidAt month, not the issue month', () => {
    const snapshot = buildFinanceSnapshot(
      [
        invoice({
          id: 'late',
          status: 'PAID',
          totalAmount: 80,
          createdAt: new Date(2026, 6, 10),
          paidAt: new Date(2026, 8, 5),
        }),
      ],
      now
    )

    expect(snapshot.months[0].key).toBe('2026-09')
    expect(snapshot.months[0].total).toBe(80)
    expect(snapshot.months.find((month) => month.key === '2026-07')?.total).toBe(0)
  })

  it('falls back to createdAt for historical paid invoices without paidAt', () => {
    const createdAt = new Date(2026, 4, 12)
    const snapshot = buildFinanceSnapshot(
      [invoice({ id: 'legacy', status: 'PAID', totalAmount: 25, createdAt, paidAt: null })],
      now
    )
    expect(snapshot.months.find((month) => month.key === '2026-05')?.total).toBe(25)
    expect(paymentDate(invoice({ id: 'legacy', status: 'PAID', totalAmount: 25, createdAt, paidAt: null }))).toEqual(
      createdAt
    )
  })

  it('sets, keeps, and clears paidAt across status changes', () => {
    const stamped = new Date(2026, 0, 15)
    expect(nextPaidAt('UNPAID', null, 'PAID', now)).toEqual(now)
    expect(nextPaidAt('PAID', stamped, 'PAID', now)).toBeUndefined()
    expect(nextPaidAt('PAID', null, 'PAID', now)).toEqual(now)
    expect(nextPaidAt('PAID', stamped, 'UNPAID', now)).toBeNull()
  })

  it('formats dinar totals used in the finance UI', () => {
    expect(sumInvoiceAmounts([{ totalAmount: '12.5' }, { totalAmount: 7.5 }])).toBe(20)
    expect(formatRsd(1000)).toContain('1.000')
    expect(buildFinanceSnapshot([], now).months[0].label).toBe('septembar 2026.')
  })
})
