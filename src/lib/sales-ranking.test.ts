import { describe, expect, it } from 'vitest'
import { parseSalesPeriod, salesPeriodStart, topBuyers, topProducts, type RankingInvoice } from './sales-ranking'

const now = new Date('2026-10-20T10:00:00.000Z')
const paid = (over: Partial<RankingInvoice>): RankingInvoice => ({
  status: 'PAID',
  paidAt: '2026-10-05T10:00:00.000Z',
  clientName: 'Kupac DOO',
  clientPib: null,
  totalAmount: '1200',
  vatAmount: '200',
  items: [],
  ...over,
})

const invoices: RankingInvoice[] = [
  paid({
    clientName: 'Firma A',
    clientPib: '101134702',
    items: [
      { productId: 'kafa', productName: 'Kafa', quantity: 2, total: '600', unitCost: '200' },
      { productId: null, productName: 'Prevoz', quantity: 1, total: '400', unitCost: '0' },
    ],
  }),
  paid({
    clientName: 'Firma A d.o.o.',
    clientPib: '101134702',
    totalAmount: '600',
    vatAmount: '100',
    items: [{ productId: 'kafa', productName: 'Kafa 200g', quantity: 1, total: '500', unitCost: null }],
  }),
  // Not counted: unpaid, predračun, paid before the period.
  paid({ status: 'UNPAID', paidAt: null, items: [{ productId: 'x', productName: 'X', quantity: 9, total: '9000', unitCost: '1' }] }),
  paid({ documentType: 'PROFORMA', items: [{ productId: 'x', productName: 'X', quantity: 9, total: '9000', unitCost: '1' }] }),
  paid({ paidAt: '2026-09-30T10:00:00.000Z', items: [{ productId: 'x', productName: 'X', quantity: 9, total: '9000', unitCost: '1' }] }),
]

describe('sales ranking (ROADMAP A9.20)', () => {
  const from = salesPeriodStart('month', now)

  it('ranks products by revenue without PDV from paid invoices in the period', () => {
    expect(topProducts(invoices, from, now)).toEqual([
      { productName: 'Kafa', quantity: 3, revenue: 1100, profit: null },
      { productName: 'Prevoz', quantity: 1, revenue: 400, profit: 400 },
    ])
  })

  it('never guesses profit when a line has no purchase-cost snapshot', () => {
    const onlyFirst = topProducts(invoices.slice(0, 1), from, now)
    expect(onlyFirst[0]).toEqual({ productName: 'Kafa', quantity: 2, revenue: 600, profit: 200 })
  })

  it('ranks buyers by revenue without PDV, one buyer per PIB', () => {
    expect(topBuyers(invoices, from, now)).toEqual([
      { clientName: 'Firma A', clientPib: '101134702', revenue: 1500, invoiceCount: 2 },
    ])
  })

  it('counts the quarter from the start of the month two months back, in Belgrade time', () => {
    expect(salesPeriodStart('quarter', now).toISOString()).toBe('2026-07-31T22:00:00.000Z')
    expect(salesPeriodStart('year', now).toISOString()).toBe('2025-12-31T23:00:00.000Z')
    expect(topProducts(invoices, salesPeriodStart('quarter', now), now).find((row) => row.productName === 'X')?.quantity).toBe(9)
  })

  it('reads the period from the address safely', () => {
    expect(parseSalesPeriod('year')).toBe('year')
    expect(parseSalesPeriod(['quarter'])).toBe('quarter')
    expect(parseSalesPeriod('sve')).toBe('month')
  })
})
