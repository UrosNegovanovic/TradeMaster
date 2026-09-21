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
