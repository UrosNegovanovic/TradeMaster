import { describe, expect, it } from 'vitest'
import {
  buildFinanceSnapshot,
  formatRsd,
  marginPercent,
  nextPaidAt,
  paymentDate,
  sumInvoiceAmounts,
  totalProfit,
  unitProfit,
} from './invoice-finance'

const now = new Date(2026, 8, 21, 10, 0, 0)

function invoice(partial: {
  id: string
  status: string
  totalAmount: number
  createdAt?: Date
  paidAt?: Date | null
  items?: Array<{ quantity: number; unitCost: number | string | null }>
}) {
  return {
    id: partial.id,
    invoiceNumber: partial.id,
    clientName: 'Klijent',
    status: partial.status,
    totalAmount: partial.totalAmount,
    createdAt: partial.createdAt ?? new Date(2026, 7, 1),
    paidAt: partial.paidAt,
    items: partial.items ?? [],
  }
}

describe('invoice-finance', () => {
  it('ignores proformas: they are neither receivables nor revenue', () => {
    const snapshot = buildFinanceSnapshot(
      [
        invoice({ id: 'a', status: 'UNPAID', totalAmount: 100 }),
        { ...invoice({ id: 'p1', status: 'UNPAID', totalAmount: 500 }), documentType: 'PROFORMA' },
        { ...invoice({ id: 'p2', status: 'PAID', totalAmount: 700, paidAt: now }), documentType: 'PROFORMA' },
      ],
      now
    )
    expect(snapshot.receivables).toBe(100)
    expect(snapshot.openCount).toBe(1)
    expect(snapshot.monthRevenue).toBe(0)
  })

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

  it('exposes line profit helpers used by invoice finance', () => {
    expect(unitProfit(200, 120)).toBe(80)
    expect(totalProfit(2, 50, 20)).toBe(60)
    expect(marginPercent(80, 200)).toBe(40)
  })

  it('calculates paid invoice profit and margin from snapshotted unit costs', () => {
    const snapshot = buildFinanceSnapshot(
      [
        invoice({
          id: 'costed',
          status: 'PAID',
          totalAmount: 200,
          paidAt: now,
          items: [
            { quantity: 2, unitCost: 50 },
            { quantity: 1, unitCost: '20' },
          ],
        }),
      ],
      now
    )

    expect(snapshot.monthCost).toBe(120)
    expect(snapshot.monthProfit).toBe(80)
    expect(snapshot.monthMarginPercent).toBe(40)
    expect(snapshot.monthMissingCostCount).toBe(0)
    expect(snapshot.thisMonthInvoices[0]).toMatchObject({
      costTotal: 120,
      profit: 80,
      marginPercent: 40,
      hasCompleteCost: true,
    })
  })

  it('does not present partial profit as a complete result when a paid invoice lacks cost', () => {
    const snapshot = buildFinanceSnapshot(
      [
        invoice({
          id: 'missing-cost',
          status: 'PAID',
          totalAmount: 100,
          paidAt: now,
          items: [{ quantity: 1, unitCost: null }],
        }),
      ],
      now
    )

    expect(snapshot.monthCost).toBeNull()
    expect(snapshot.monthProfit).toBeNull()
    expect(snapshot.monthMarginPercent).toBeNull()
    expect(snapshot.monthMissingCostCount).toBe(1)
    expect(snapshot.thisMonthInvoices[0]).toMatchObject({
      costTotal: null,
      profit: null,
      marginPercent: null,
      hasCompleteCost: false,
    })
  })
})

describe('invoice-finance with PDV', () => {
  it('books revenue and profit on the osnovica while receivables stay gross', () => {
    const snapshot = buildFinanceSnapshot(
      [
        {
          ...invoice({
            id: 'paid-vat',
            status: 'PAID',
            totalAmount: 120,
            paidAt: new Date(2026, 8, 10),
            items: [{ quantity: 2, unitCost: 30 }],
          }),
          vatAmount: 20,
        },
        {
          ...invoice({ id: 'open-vat', status: 'UNPAID', totalAmount: 60 }),
          vatAmount: 10,
        },
      ],
      now
    )

    expect(snapshot.receivables).toBe(60)
    expect(snapshot.monthRevenue).toBe(100)
    expect(snapshot.yearRevenue).toBe(100)
    expect(snapshot.allTimePaid).toBe(100)
    expect(snapshot.monthCost).toBe(60)
    expect(snapshot.monthProfit).toBe(40)
    expect(snapshot.monthMarginPercent).toBe(40)
  })

  it('leaves historical invoices (no vatAmount) unchanged', () => {
    const snapshot = buildFinanceSnapshot(
      [
        invoice({
          id: 'old',
          status: 'PAID',
          totalAmount: 100,
          paidAt: new Date(2026, 8, 10),
          items: [{ quantity: 1, unitCost: 60 }],
        }),
      ],
      now
    )

    expect(snapshot.monthRevenue).toBe(100)
    expect(snapshot.monthProfit).toBe(40)
  })
})
