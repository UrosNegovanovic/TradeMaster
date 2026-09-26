import { Prisma } from '@prisma/client'

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

type InvoiceNumberTransaction = {
  $executeRaw(query: Prisma.Sql): Promise<unknown>
  invoice: {
    findMany(args: {
      where: { profileId: string; invoiceNumber: { endsWith: string } }
      select: { invoiceNumber: true }
    }): Promise<Array<{ invoiceNumber: string }>>
  }
}

/** Must run inside the same transaction that creates the invoice. */
export async function reserveNextInvoiceNumber(
  tx: InvoiceNumberTransaction,
  profileId: string,
  now = new Date()
): Promise<string> {
  const year = now.getFullYear()
  const lockKey = `invoice-number:${profileId}:${year}`
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`)
  const invoices = await tx.invoice.findMany({
    where: { profileId, invoiceNumber: { endsWith: `/${year}` } },
    select: { invoiceNumber: true },
  })
  return nextInvoiceNumber(year, invoices.map((invoice) => invoice.invoiceNumber))
}
