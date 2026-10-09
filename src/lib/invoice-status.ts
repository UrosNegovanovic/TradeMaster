export const OPEN_INVOICE_STATUS = 'UNPAID' as const

export function isPaidInvoiceStatus(status: string | null | undefined): boolean {
  return status === 'PAID'
}

export function invoicesListHref(status?: string | null): string {
  return isPaidInvoiceStatus(status) ? '/invoices?status=paid' : '/invoices'
}

export function invoiceStatusLabel(status: string | null | undefined): string {
  return isPaidInvoiceStatus(status) ? 'Plaćeno' : 'Otvoreno'
}

export type InvoiceStatusAction = 'issue' | 'pay' | 'reopen'

/**
 * The one status step offered on an invoice. A draft is issued only when the user asks (stock goes out then,
 * ROADMAP A9.1); an open invoice is marked paid; a paid one can go back to open.
 */
export function invoiceStatusAction(status: string | null | undefined): InvoiceStatusAction {
  if (status === 'DRAFT') return 'issue'
  return isPaidInvoiceStatus(status) ? 'reopen' : 'pay'
}
