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

/**
 * Proforma (predračun): draft is neutral, a sent one waits for payment, past its "važi do" day it has
 * expired, and once turned into an invoice it is done. It is never overdue: nobody owes it.
 */
export function documentStatusView(
  doc: {
    documentType?: string | null
    status: string | null | undefined
    dueDate: Date | string | null | undefined
    convertedInvoiceId?: string | null
  },
  now = new Date()
): InvoiceStatusView {
  if (doc.documentType !== 'PROFORMA') return invoiceStatusView(doc.status, doc.dueDate, now)
  if (doc.convertedInvoiceId) return { tone: 'success', label: 'Pretvoren u fakturu' }
  if (doc.status === 'DRAFT') return { tone: 'neutral', label: 'Nacrt' }
  if (doc.dueDate && daysOverdue(doc.dueDate, now) > 0) return { tone: 'neutral', label: 'Istekao' }
  return { tone: 'warning', label: 'Čeka uplatu' }
}

export const INVOICE_TONE_BADGE_VARIANT = {
  neutral: 'secondary',
  warning: 'warning',
  success: 'success',
  danger: 'destructive',
} as const satisfies Record<InvoiceStatusTone, 'secondary' | 'warning' | 'success' | 'destructive'>
