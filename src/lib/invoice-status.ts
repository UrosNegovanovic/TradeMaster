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

/** Deleting a paid invoice would erase booked revenue and leave a gap in the numbers (ROADMAP A9.2). */
export const PAID_DELETE_MESSAGE =
  'Plaćena faktura se ne briše. Ako je greška, prvo je vratite među otvorene, pa je obrišite.'

/** Delete is offered only for documents that are neither paid nor sent to SEF. */
export function canDeleteInvoice(invoice: { status: string; sefStatus?: string | null }): boolean {
  return !isPaidInvoiceStatus(invoice.status) && !invoice.sefStatus
}
