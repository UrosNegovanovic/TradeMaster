import { onlyInvoices } from '@/lib/document-type'
import { invoiceBaseAmount } from '@/lib/invoice-finance'
import { foldSerbian } from '@/lib/invoice-search'
import { addLocalMonths, startOfLocalMonth, startOfLocalYear } from '@/lib/local-date'

type Amount = number | string | { toString(): string }

/**
 * "Najprodavanije i najbolji kupci" on Finansije (ROADMAP A9.20). Cash basis like the rest of Finansije:
 * a sale counts in the period its invoice was paid in. Amounts are without PDV, from the line snapshots,
 * so a later price change never rewrites history. Predračuni never count.
 */
export const SALES_PERIODS = ['month', 'quarter', 'year'] as const
export type SalesPeriod = (typeof SALES_PERIODS)[number]

export const SALES_PERIOD_LABELS: Record<SalesPeriod, string> = {
  month: 'Ovaj mesec',
  quarter: 'Poslednja 3 meseca',
  year: 'Ova godina',
}

export function parseSalesPeriod(value: string | string[] | null | undefined): SalesPeriod {
  const text = Array.isArray(value) ? value[0] : value
  return (SALES_PERIODS as readonly string[]).includes(text ?? '') ? (text as SalesPeriod) : 'month'
}

/** Start of the period in Europe/Belgrade; the end is now. */
export function salesPeriodStart(period: SalesPeriod, now = new Date()): Date {
  if (period === 'year') return startOfLocalYear(now)
  if (period === 'quarter') return addLocalMonths(startOfLocalMonth(now), -2)
  return startOfLocalMonth(now)
}

export type RankingInvoice = {
  documentType?: string | null
  status: string
  paidAt?: Date | string | null
  clientName: string
  clientPib?: string | null
  totalAmount: Amount
  vatAmount?: Amount | null
  items: Array<{
    productId: string | null
    productName: string
    quantity: number
    total: Amount
    unitCost: Amount | null
  }>
}

export type ProductSales = {
  productName: string
  quantity: number
  revenue: number
  /** Null when some sold line has no purchase-cost snapshot (never guessed). */
  profit: number | null
}

export type BuyerSales = { clientName: string; clientPib: string | null; revenue: number; invoiceCount: number }

const money = (value: Amount | null | undefined) => Number(value?.toString() ?? 0) || 0
const round2 = (value: number) => Math.round(value * 100) / 100

function paidInPeriod(invoices: RankingInvoice[], from: Date, now: Date): RankingInvoice[] {
  return onlyInvoices(invoices).filter((invoice) => {
    if (invoice.status !== 'PAID' || !invoice.paidAt) return false
    const paid = new Date(invoice.paidAt)
    return paid >= from && paid <= now
  })
}

export function topProducts(invoices: RankingInvoice[], from: Date, now = new Date(), limit = 10): ProductSales[] {
  const byProduct = new Map<string, ProductSales & { costKnown: boolean; cost: number }>()
  for (const invoice of paidInPeriod(invoices, from, now)) {
    for (const item of invoice.items) {
      // Same product even if renamed later; free lines and deleted products group by their name.
      const key = item.productId ? `id:${item.productId}` : `name:${foldSerbian(item.productName)}`
      const row = byProduct.get(key) ?? {
        productName: item.productName,
        quantity: 0,
        revenue: 0,
        profit: null,
        costKnown: true,
        cost: 0,
      }
      row.quantity += item.quantity
      row.revenue += money(item.total)
      if (item.unitCost === null) row.costKnown = false
      else row.cost += item.quantity * money(item.unitCost)
      byProduct.set(key, row)
    }
  }
  return [...byProduct.values()]
    .map(({ costKnown, cost, ...row }) => ({
      ...row,
      revenue: round2(row.revenue),
      profit: costKnown ? round2(row.revenue - cost) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit)
}

export function topBuyers(invoices: RankingInvoice[], from: Date, now = new Date(), limit = 10): BuyerSales[] {
  const byBuyer = new Map<string, BuyerSales>()
  for (const invoice of paidInPeriod(invoices, from, now)) {
    const pib = invoice.clientPib?.replace(/\D/g, '') || ''
    const key = pib ? `pib:${pib}` : `name:${foldSerbian(invoice.clientName)}`
    const row = byBuyer.get(key) ?? { clientName: invoice.clientName, clientPib: pib || null, revenue: 0, invoiceCount: 0 }
    row.revenue += invoiceBaseAmount(invoice)
    row.invoiceCount += 1
    byBuyer.set(key, row)
  }
  return [...byBuyer.values()]
    .map((row) => ({ ...row, revenue: round2(row.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}
