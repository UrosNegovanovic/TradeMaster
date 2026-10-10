import type { PrismaClient } from '@prisma/client'
import { invoiceSharePath } from '@/lib/public-invoice'

/**
 * Platform billing (B) documents in the issuer's own invoice list: predračuni made by the billing job
 * (linked from billing_notices) and the invoices they were converted into after payment. Lets the owner tell
 * TradeMaster subscriptions apart from invoices to his own clients; the number series stays the same.
 */
export function subscriptionInvoiceIds(
  invoices: Array<{ id: string; convertedInvoiceId?: string | null; billingNotice?: { id: string } | null }>
): Set<string> {
  const ids = new Set<string>()
  for (const invoice of invoices) {
    if (!invoice.billingNotice) continue
    ids.add(invoice.id)
    if (invoice.convertedInvoiceId) ids.add(invoice.convertedInvoiceId)
  }
  return ids
}

export type SubscriptionDocument = {
  invoiceNumber: string
  periodFrom: string
  periodUntil: string
  totalAmount: string
  dueDate: string
  status: string
  /** Public share path (IPS QR, PDF); null when the owner turned the link off. */
  url: string | null
}

/** A company's own subscription predračuni (never test ones), newest first, with the public link. */
export async function subscriptionDocumentsFor(db: Pick<PrismaClient, 'billingNotice'>, profileId: string): Promise<SubscriptionDocument[]> {
  const notices = await db.billingNotice.findMany({
    where: { profileId, isTest: false, status: 'sent', invoiceId: { not: null } },
    orderBy: { periodFrom: 'desc' },
    take: 24,
    select: {
      periodFrom: true,
      periodUntil: true,
      invoice: {
        select: { invoiceNumber: true, totalAmount: true, dueDate: true, status: true, shareToken: true, shareEnabled: true, convertedInvoiceId: true },
      },
    },
  })
  return notices.flatMap(({ periodFrom, periodUntil, invoice }) =>
    invoice
      ? [
          {
            invoiceNumber: invoice.invoiceNumber,
            periodFrom: periodFrom.toISOString().slice(0, 10),
            periodUntil: periodUntil.toISOString().slice(0, 10),
            totalAmount: invoice.totalAmount.toString(),
            dueDate: invoice.dueDate.toISOString().slice(0, 10),
            status: invoice.convertedInvoiceId ? 'PAID' : invoice.status,
            url: invoice.shareEnabled && invoice.shareToken ? invoiceSharePath(invoice.shareToken) : null,
          },
        ]
      : []
  )
}
