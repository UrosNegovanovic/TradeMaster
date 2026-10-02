import { Invoice } from '@/types/invoice'

export interface InvoiceMonthGroup {
  /** "YYYY-MM", sortable as a string. */
  key: string
  /** e.g. "Septembar 2026." */
  label: string
  invoices: Invoice[]
  total: number
}

const MONTH_LABELS = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Jun',
  'Jul',
  'Avgust',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
]

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}.`
}

/** Paid invoices are grouped by the month they were paid in; anything else by the month it was created in. */
function invoiceMonthDate(invoice: Invoice): Date {
  return new Date(invoice.paidAt ?? invoice.createdAt)
}

export function currentMonthKey(now: Date = new Date()): string {
  return monthKey(now)
}

/**
 * Groups invoices by calendar month (newest month first), so the invoices
 * page can show the current month immediately and tuck older months away
 * in a collapsible monthly archive instead of one ever-growing flat list.
 */
export function groupInvoicesByMonth(invoices: Invoice[]): InvoiceMonthGroup[] {
  const groups = new Map<string, InvoiceMonthGroup>()

  for (const invoice of invoices) {
    const date = invoiceMonthDate(invoice)
    const key = monthKey(date)
    const existing = groups.get(key)
    if (existing) {
      existing.invoices.push(invoice)
      existing.total += Number(invoice.totalAmount)
    } else {
      groups.set(key, {
        key,
        label: monthLabel(date),
        invoices: [invoice],
        total: Number(invoice.totalAmount),
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
}
