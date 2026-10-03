import { daysOverdue, formatDaysOverdue } from '@/lib/overdue-invoices'

export type InvoiceStatusTone = 'neutral' | 'warning' | 'success' | 'danger'

export interface InvoiceStatusView {
  tone: InvoiceStatusTone
  label: string
}

/**
 * Visual state of an invoice: draft is neutral, open is a warning, paid is success,
 * and an issued invoice past its due day (Europe/Belgrade) is danger with the day count.
 */
export function invoiceStatusView(
  status: string | null | undefined,
  dueDate: Date | string | null | undefined,
  now = new Date()
): InvoiceStatusView {
  if (status === 'PAID') return { tone: 'success', label: 'Plaćeno' }
  if (status === 'DRAFT') return { tone: 'neutral', label: 'Nacrt' }

  const days = dueDate ? daysOverdue(dueDate, now) : 0
  if (days > 0) return { tone: 'danger', label: `Kasni ${formatDaysOverdue(days)}` }
  return { tone: 'warning', label: 'Otvoreno' }
}

export const INVOICE_TONE_BADGE_VARIANT = {
  neutral: 'secondary',
  warning: 'warning',
  success: 'success',
  danger: 'destructive',
} as const satisfies Record<InvoiceStatusTone, 'secondary' | 'warning' | 'success' | 'destructive'>
