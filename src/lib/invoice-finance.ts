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
}

export type FinanceMonth = {
  key: string
  label: string
  start: Date
  total: number
  count: number
  invoices: FinanceInvoiceInput[]
}

export type FinanceSnapshot = {
  receivables: number
  openCount: number
  monthRevenue: number
  yearRevenue: number
  allTimePaid: number
  months: FinanceMonth[]
  thisMonthInvoices: FinanceInvoiceInput[]
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
  const paid = invoices.filter((invoice) => isPaidInvoiceStatus(invoice.status))
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

  return {
    receivables: sumInvoiceAmounts(open),
    openCount: open.length,
    monthRevenue: thisMonth?.total ?? 0,
    yearRevenue: sumInvoiceAmounts(
      paid.filter((invoice) => {
        const paidOn = paymentDate(invoice)
        return Boolean(paidOn && paidOn >= yearStart && paidOn < nextMonth)
      })
    ),
    allTimePaid: sumInvoiceAmounts(paid),
    months,
    thisMonthInvoices: [...(thisMonth?.invoices ?? [])].sort((left, right) => {
      const leftDate = paymentDate(left)?.getTime() ?? 0
      const rightDate = paymentDate(right)?.getTime() ?? 0
      return rightDate - leftDate
    }),
  }
}
