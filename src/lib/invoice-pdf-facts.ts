import { splitSerbianAddress } from '@/lib/sef-ubl'

/**
 * Header facts a Serbian buyer and accountant expect on a printed invoice (ROADMAP A9.9):
 * place and date of issue, date of supply (datum prometa), and the note for sellers outside PDV.
 * Wording to be confirmed by an accountant; these are the usual phrases.
 */
export type InvoicePdfFacts = {
  /** City from the seller's address ("Ulica 1, 11000 Beograd" -> "Beograd"); null when unknown. */
  issuePlace: string | null
  issueDate: Date
  /** Datum prometa: the issue date until the app stores a separate one. Not printed on a predračun. */
  supplyDate: Date | null
  /** "Obveznik nije u sistemu PDV-a." for a seller outside PDV, never on an invoice issued with PDV. */
  nonVatNote: string | null
}

export const NON_VAT_NOTE = 'Obveznik nije u sistemu PDV-a.'

export function invoicePdfFacts(input: {
  createdAt: Date | string
  documentType?: string | null
  vatEnabled?: boolean
  sellerAddress?: string | null
  /** Company setting today; old invoices (before PDV support) have vatEnabled false even for PDV sellers. */
  sellerInVatSystem?: boolean | null
}): InvoicePdfFacts {
  const issueDate = new Date(input.createdAt)
  const city = input.sellerAddress?.includes(',') ? splitSerbianAddress(input.sellerAddress).city : ''
  const outsideVat = input.vatEnabled !== true && input.sellerInVatSystem === false
  return {
    issuePlace: city || null,
    issueDate,
    supplyDate: input.documentType === 'PROFORMA' ? null : issueDate,
    nonVatNote: outsideVat ? NON_VAT_NOTE : null,
  }
}
