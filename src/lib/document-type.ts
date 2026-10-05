/**
 * Predračun (PROFORMA) shares the invoice table, form and PDF, but it is an offer, not an invoice:
 * it has its own number series, never moves stock, is never revenue or a receivable, and cannot be
 * marked paid. The buyer pays it, then the owner turns it into an invoice.
 * Otpremnica (delivery note) is not stored at all: it is a price-free PDF of an issued invoice.
 */

export const DOCUMENT_TYPES = ['INVOICE', 'PROFORMA'] as const
export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]

export const PROFORMA_PAID_MESSAGE =
  'Predračun se ne označava kao plaćen. Kada kupac uplati, pretvorite ga u fakturu.'

export function isProforma(doc: { documentType?: string | null } | null | undefined): boolean {
  return doc?.documentType === 'PROFORMA'
}

/** Finance, receivables, overdue alerts and the accountant export only ever see invoices. */
export function onlyInvoices<T extends { documentType?: string | null }>(docs: T[]): T[] {
  return docs.filter((doc) => !isProforma(doc))
}

export function parseDocumentType(value: unknown): DocumentTypeValue {
  return value === 'PROFORMA' ? 'PROFORMA' : 'INVOICE'
}

/** The status that drives stock sync: a proforma behaves like a draft, so it never takes goods. */
export function stockStatusFor(documentType: string | null | undefined, status: string): string {
  return documentType === 'PROFORMA' ? 'DRAFT' : status
}

export type DocumentLabels = {
  name: string
  nameLower: string
  pdfTitle: string
  numberLabel: string
  dueLabel: string
  newTitle: string
  saveLabel: string
  fileSuffix: string
}

const INVOICE_LABELS: DocumentLabels = {
  name: 'Faktura',
  nameLower: 'faktura',
  pdfTitle: 'FAKTURA',
  numberLabel: 'Broj fakture',
  dueLabel: 'Rok plaćanja',
  newTitle: 'Nova faktura',
  saveLabel: 'Sačuvaj fakturu',
  fileSuffix: 'faktura',
}

const PROFORMA_LABELS: DocumentLabels = {
  name: 'Predračun',
  nameLower: 'predračun',
  pdfTitle: 'PREDRAČUN',
  numberLabel: 'Broj predračuna',
  dueLabel: 'Važi do',
  newTitle: 'Novi predračun',
  saveLabel: 'Sačuvaj predračun',
  fileSuffix: 'predracun',
}

export function documentLabels(documentType: string | null | undefined): DocumentLabels {
  return documentType === 'PROFORMA' ? PROFORMA_LABELS : INVOICE_LABELS
}

/** Only an issued invoice has a delivery note: a draft can still change, a proforma ships nothing. */
export function canPrintDeliveryNote(doc: { documentType?: string | null; status: string }): boolean {
  return !isProforma(doc) && (doc.status === 'UNPAID' || doc.status === 'PAID')
}

const DAY_MS = 86_400_000

/**
 * Due date of the invoice made from a proforma: today plus the proforma's own payment term
 * (its due date minus its issue date, in whole days, at least 0).
 */
export function convertedDueDate(
  proforma: { createdAt: Date | string; dueDate: Date | string },
  now = new Date()
): Date {
  const created = new Date(proforma.createdAt).getTime()
  const due = new Date(proforma.dueDate).getTime()
  const termDays =
    Number.isFinite(created) && Number.isFinite(due) ? Math.max(0, Math.round((due - created) / DAY_MS)) : 0
  return new Date(now.getTime() + termDays * DAY_MS)
}

/** "05_2026_faktura.pdf", "PR-02_2026_predracun.pdf", "05_2026_otpremnica.pdf" (no slashes in file names). */
export function pdfFileName(documentNumber: string, kind: string | null | undefined): string {
  const suffix = kind === 'delivery' ? 'otpremnica' : documentLabels(kind).fileSuffix
  const safeNumber = documentNumber.trim().replace(/[\\/\s]+/g, '_') || 'dokument'
  return `${safeNumber}_${suffix}.pdf`
}
