import type { Invoice, InvoiceItem, PrismaClient, Profile } from '@prisma/client'
import { buildSefInvoiceXml, type SefXmlResult } from '@/lib/sef-ubl'

type Db = Pick<PrismaClient, 'client'>

/**
 * The UBL for an issued invoice, shared by the XML download and the SEF send (ROADMAP A3), so
 * both refuse with the same `problems`. The buyer's matični broj comes from the saved buyer
 * (Kupci) with the same PIB, because invoices store only the PIB.
 */
export async function buildInvoiceSefXml(
  db: Db,
  profile: Profile,
  invoice: Invoice & { items: InvoiceItem[] }
): Promise<SefXmlResult> {
  const buyer = invoice.clientPib
    ? await db.client.findFirst({
        where: { profileId: profile.id, pib: invoice.clientPib },
        orderBy: { updatedAt: 'desc' },
        select: { registrationNumber: true },
      })
    : null

  return buildSefInvoiceXml({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.createdAt,
    dueDate: invoice.dueDate,
    vatEnabled: invoice.vatEnabled,
    seller: {
      name: profile.companyName,
      pib: profile.pib,
      registrationNumber: profile.registrationNumber,
      address: profile.address,
      email: profile.contactEmail,
      giroAccount: profile.giroAccount,
    },
    buyer: {
      name: invoice.clientName,
      pib: invoice.clientPib,
      registrationNumber: buyer?.registrationNumber ?? null,
      address: invoice.clientAddress,
    },
    items: invoice.items,
  })
}

/** Only issued invoices go to SEF: never a predračun, never a draft. */
export function sefDocumentRefusal(invoice: Pick<Invoice, 'documentType' | 'status'>): string | null {
  if (invoice.documentType !== 'INVOICE') return 'Predračun se ne šalje u SEF. Pretvorite ga u fakturu.'
  if (invoice.status === 'DRAFT') return 'Nacrt se ne šalje u SEF. Prvo izdajte fakturu.'
  return null
}

/** Buyer's matični broj for the SEF registration check (same lookup as the UBL). */
export async function buyerRegistrationNumber(db: Db, profileId: string, pib: string | null): Promise<string | null> {
  if (!pib) return null
  const buyer = await db.client.findFirst({
    where: { profileId, pib },
    orderBy: { updatedAt: 'desc' },
    select: { registrationNumber: true },
  })
  return buyer?.registrationNumber ?? null
}
