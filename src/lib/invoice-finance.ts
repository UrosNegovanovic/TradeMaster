import { isPaidInvoiceStatus } from '@/lib/invoice-status'
import {
  addLocalMonths,
  formatLocalYm,
  startOfLocalMonth,
  startOfLocalYear,
} from '@/lib/local-date'

/**
 * Cash-basis finance for a wholesale SaaS: the invoice is the ledger.
 * Open invoices are receivables. Marking paid books revenue on paidAt
 * (not issue date). Reopening reverses the booking. No second books.
 */

export const FINANCE_MONTHS = 12

export type FinanceInvoiceInput = {
  id: string
  invoiceNumber: string
  clientName: string
  status: string
  totalAmount: number | string | { toString(): string }
  createdAt: Date | string
  paidAt?: Date | string | null
  items?: Array<{
    quantity: number
    unitCost: number | string | { toString(): string } | null
  }>
}

export type FinanceInvoiceResult = FinanceInvoiceInput & {
  costTotal: number | null
  profit: number | null
  marginPercent: number | null
  hasCompleteCost: boolean
}

export type FinanceMonth = {
  key: string
  label: string
  start: Date
  total: number
  count: number
  invoices: FinanceInvoiceResult[]
}

export type FinanceSnapshot = {
  receivables: number
  openCount: number
  monthRevenue: number
  yearRevenue: number
  allTimePaid: number
  monthCost: number | null
  monthProfit: number | null
  monthMarginPercent: number | null
  monthMissingCostCount: number
  yearCost: number | null
  yearProfit: number | null
  yearMarginPercent: number | null
  yearMissingCostCount: number
  months: FinanceMonth[]
  thisMonthInvoices: FinanceInvoiceResult[]
}

export function toInvoiceAmount(value: number | string | { toString(): string }): number {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export function formatRsd(value: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function sumInvoiceAmounts(
  invoices: Array<{ totalAmount: number | string | { toString(): string } }>
): number {
  return invoices.reduce((total, invoice) => total + toInvoiceAmount(invoice.totalAmount), 0)
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function invoiceProfit(invoice: FinanceInvoiceInput): FinanceInvoiceResult {
  const items = invoice.items ?? []
  const hasCompleteCost =
    items.length > 0 &&
    items.every((item) => {
      if (item.unitCost === null) return false
      const unitCost = toInvoiceAmount(item.unitCost)
      return Number.isFinite(item.quantity) && item.quantity > 0 && unitCost >= 0
    })

  if (!hasCompleteCost) {
    return { ...invoice, costTotal: null, profit: null, marginPercent: null, hasCompleteCost: false }
  }

  const revenue = toInvoiceAmount(invoice.totalAmount)
  const costTotal = roundCurrency(
    items.reduce((total, item) => total + item.quantity * toInvoiceAmount(item.unitCost!), 0)
  )
  const profit = roundCurrency(revenue - costTotal)
  const marginPercent = revenue > 0 ? roundCurrency((profit / revenue) * 100) : null

  return { ...invoice, costTotal, profit, marginPercent, hasCompleteCost: true }
}

function profitPeriod(invoices: FinanceInvoiceResult[]) {
  const missingCostCount = invoices.filter((invoice) => !invoice.hasCompleteCost).length
  if (missingCostCount > 0) {
    return { cost: null, profit: null, marginPercent: null, missingCostCount }
  }

  const revenue = sumInvoiceAmounts(invoices)
  const cost = roundCurrency(invoices.reduce((total, invoice) => total + (invoice.costTotal ?? 0), 0))
  const profit = roundCurrency(revenue - cost)
  return {
    cost,
    profit,
    marginPercent: revenue > 0 ? roundCurrency((profit / revenue) * 100) : null,
    missingCostCount: 0,
  }
}

export function paymentDate(invoice: FinanceInvoiceInput): Date | null {
  if (!isPaidInvoiceStatus(invoice.status)) {
    return null
  }

  const raw = invoice.paidAt ?? invoice.createdAt
  const date = raw instanceof Date ? raw : new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function nextPaidAt(
  currentStatus: string,
  currentPaidAt: Date | string | null | undefined,
  nextStatus: string,
  now = new Date()
): Date | null | undefined {
  if (!isPaidInvoiceStatus(nextStatus)) {
    return null
  }

  if (isPaidInvoiceStatus(currentStatus) && currentPaidAt) {
    return undefined
  }

  return now
}

const MONTHS_SR = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
]

function formatMonthLabel(date: Date): string {
  return `${MONTHS_SR[date.getMonth()]} ${date.getFullYear()}.`
}

export function buildFinanceSnapshot(
  invoices: FinanceInvoiceInput[],
  now = new Date()
): FinanceSnapshot {
  const open = invoices.filter((invoice) => !isPaidInvoiceStatus(invoice.status))
  const paid = invoices
    .filter((invoice) => isPaidInvoiceStatus(invoice.status))
    .map(invoiceProfit)
  const monthStart = startOfLocalMonth(now)
  const nextMonth = addLocalMonths(monthStart, 1)
  const yearStart = startOfLocalYear(now)

  const months: FinanceMonth[] = []
  for (let offset = 0; offset < FINANCE_MONTHS; offset += 1) {
    const start = addLocalMonths(monthStart, -offset)
    const end = addLocalMonths(start, 1)
    const monthInvoices = paid.filter((invoice) => {
      const paidOn = paymentDate(invoice)
      return Boolean(paidOn && paidOn >= start && paidOn < end)
    })

    months.push({
      key: formatLocalYm(start),
      label: formatMonthLabel(start),
      start,
      total: sumInvoiceAmounts(monthInvoices),
      count: monthInvoices.length,
      invoices: monthInvoices,
    })
  }

  const thisMonth = months[0]
  const thisMonthProfit = profitPeriod(thisMonth?.invoices ?? [])
  const yearInvoices = paid.filter((invoice) => {
    const paidOn = paymentDate(invoice)
    return Boolean(paidOn && paidOn >= yearStart && paidOn < nextMonth)
  })
  const yearProfit = profitPeriod(yearInvoices)

  return {
    receivables: sumInvoiceAmounts(open),
    openCount: open.length,
    monthRevenue: thisMonth?.total ?? 0,
    yearRevenue: sumInvoiceAmounts(
      yearInvoices
    ),
    allTimePaid: sumInvoiceAmounts(paid),
    monthCost: thisMonthProfit.cost,
    monthProfit: thisMonthProfit.profit,
    monthMarginPercent: thisMonthProfit.marginPercent,
    monthMissingCostCount: thisMonthProfit.missingCostCount,
    yearCost: yearProfit.cost,
    yearProfit: yearProfit.profit,
    yearMarginPercent: yearProfit.marginPercent,
    yearMissingCostCount: yearProfit.missingCostCount,
    months,
    thisMonthInvoices: [...(thisMonth?.invoices ?? [])].sort((left, right) => {
      const leftDate = paymentDate(left)?.getTime() ?? 0
      const rightDate = paymentDate(right)?.getTime() ?? 0
      return rightDate - leftDate
    }),
  }
}
