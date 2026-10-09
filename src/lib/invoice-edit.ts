import { isPaidInvoiceStatus } from './invoice-status'
import { isLockedBySef } from './sef-status'

type EditableDocument = {
  id: string
  status: string
  documentType?: string | null
  convertedInvoiceId?: string | null
  sefStatus?: string | null
}

/**
 * Where "Izmeni" goes, or null when the document is locked: paid, sent to SEF (storno goes through SEF)
 * or a predračun already turned into an invoice. Mirrors the server checks in PUT /api/invoices/[id].
 */
export function invoiceEditHref(invoice: EditableDocument): string | null {
  if (isPaidInvoiceStatus(invoice.status)) return null
  if (isLockedBySef(invoice.sefStatus)) return null
  if (invoice.documentType === 'PROFORMA' && invoice.convertedInvoiceId) return null
  return `/invoices/${invoice.id}/edit`
}
