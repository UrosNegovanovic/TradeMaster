import { Decimal } from '@prisma/client/runtime/library'

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export type InvoiceItem = {
  id: string
  quantity: number
  unitPrice: Decimal
  unitCost: Decimal | null
  /** PDV rate snapshot (0, 10 or 20); unitPrice and total exclude PDV. */
  vatRate: Decimal
  discount: Decimal
  total: Decimal
  productName: string
  invoiceId: string
  productId: string | null
  product?: {
    id: string
    name: string
    sku: string
    price?: Decimal
  } | null
}

export type Invoice = {
  id: string
  invoiceNumber: string
  createdAt: Date
  dueDate: Date
  clientName: string
  clientAddress: string | null
  note?: string | null
  clientPib: string | null
  status: InvoiceStatus
  /** Amount payable (osnovica + PDV). */
  totalAmount: Decimal
  /** Snapshot of the company's PDV setting at issue time. */
  vatEnabled: boolean
  vatAmount: Decimal
  paidAt: Date | null
  /** PROFORMA = predračun (own number series, no stock, no revenue). Older API mocks may omit it. */
  documentType?: 'INVOICE' | 'PROFORMA'
  /** Proforma only: the invoice it was turned into. */
  convertedInvoiceId?: string | null
  /** SEF send state (ROADMAP A3); see src/lib/sef-status.ts. */
  sefStatus?: string | null
  sefStatusComment?: string | null
  profileId: string
  items?: InvoiceItem[]
  profile?: {
    id: string
    companyName: string | null
    contactEmail: string | null
    contactPhone: string | null
    address: string | null
    pib: string | null
    giroAccount: string | null
    inVatSystem?: boolean
    logoUrl: string | null
  }
}

export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[]
}

export type InvoiceCreateInput = {
  /** Printed on the document (ROADMAP A9.22). */
  note?: string | null
  invoiceNumber?: string
  dueDate: string | Date
  clientName: string
  clientAddress?: string
  clientPib?: string | null
  status?: InvoiceStatus
  documentType?: 'INVOICE' | 'PROFORMA'
  items: {
    productId?: string | null
    /** Free line (usluga, prevoz): no product, cost of goods 0. */
    free?: boolean
    productName: string
    quantity: number
    unitPrice: number
    discount?: number
    vatRate?: number
    total: number
  }[]
}
