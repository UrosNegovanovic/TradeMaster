import { Prisma } from '@prisma/client'
import { belgradeYear } from '@/lib/local-date'
import type { DocumentTypeValue } from '@/lib/document-type'

export const PROFORMA_NUMBER_PREFIX = 'PR-'

/**
 * Invoice numbers follow the merchant-facing "NN/YYYY" format that predates
 * the atomic-numbering work (e.g. "01/2026", "02/2026", ... "06/2026").
 * Sequence continues within a calendar year; it does NOT reset per format
 * change. Never introduce a different format here without migrating/
 * continuing the existing sequence — accounting relies on no gaps/resets.
 */
export function nextInvoiceNumber(year: number, existingNumbers: string[]): string {
  const pattern = new RegExp(`^(\\d+)/${year}$`)
  const highest = existingNumbers.reduce((max, invoiceNumber) => {
    const match = pattern.exec(invoiceNumber)
    if (!match) return max
    const sequence = Number(match[1])
    return Number.isSafeInteger(sequence) ? Math.max(max, sequence) : max
  }, 0)

  return `${String(highest + 1).padStart(2, '0')}/${year}`
}

/** Proformas (predračuni) have their own per-year series: "PR-01/2026", "PR-02/2026", ... */
export function nextProformaNumber(year: number, existingNumbers: string[]): string {
  const withoutPrefix = existingNumbers
    .filter((number) => number.startsWith(PROFORMA_NUMBER_PREFIX))
    .map((number) => number.slice(PROFORMA_NUMBER_PREFIX.length))
  return `${PROFORMA_NUMBER_PREFIX}${nextInvoiceNumber(year, withoutPrefix)}`
}

type InvoiceNumberTransaction = {
  $executeRaw(query: Prisma.Sql): Promise<unknown>
  invoice: {
    findMany(args: {
      where: { profileId: string; documentType: DocumentTypeValue; invoiceNumber: { endsWith: string } }
      select: { invoiceNumber: true }
    }): Promise<Array<{ invoiceNumber: string }>>
  }
}

/** Must run inside the same transaction that creates the invoice. */
export async function reserveNextInvoiceNumber(
  tx: InvoiceNumberTransaction,
  profileId: string,
  now = new Date(),
  documentType: DocumentTypeValue = 'INVOICE'
): Promise<string> {
  // The invoice year is the Belgrade calendar year, not the server (UTC) clock: just after midnight on
  // 1 Jan a UTC server still reports the old year.
  const year = belgradeYear(now)
  const lockKey =
    documentType === 'PROFORMA'
      ? `proforma-number:${profileId}:${year}`
      : `invoice-number:${profileId}:${year}`
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`)
  const invoices = await tx.invoice.findMany({
    where: { profileId, documentType, invoiceNumber: { endsWith: `/${year}` } },
    select: { invoiceNumber: true },
  })
  const numbers = invoices.map((invoice) => invoice.invoiceNumber)
  return documentType === 'PROFORMA' ? nextProformaNumber(year, numbers) : nextInvoiceNumber(year, numbers)
}
