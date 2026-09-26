import { Prisma } from '@prisma/client'

export function nextInvoiceNumber(year: number, existingNumbers: string[]): string {
  const pattern = new RegExp(`^${year}-(\\d+)$`)
  const highest = existingNumbers.reduce((max, invoiceNumber) => {
    const match = pattern.exec(invoiceNumber)
    if (!match) return max
    const sequence = Number(match[1])
    return Number.isSafeInteger(sequence) ? Math.max(max, sequence) : max
  }, 0)

  return `${year}-${String(highest + 1).padStart(3, '0')}`
}

type InvoiceNumberTransaction = {
  $executeRaw(query: Prisma.Sql): Promise<unknown>
  invoice: {
    findMany(args: {
      where: { profileId: string; invoiceNumber: { startsWith: string } }
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
    where: { profileId, invoiceNumber: { startsWith: `${year}-` } },
    select: { invoiceNumber: true },
  })
  return nextInvoiceNumber(year, invoices.map((invoice) => invoice.invoiceNumber))
}
