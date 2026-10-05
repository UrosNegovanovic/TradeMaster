/**
 * Public contract for a shared invoice: what the buyer may see behind a revocable token link.
 * Never includes unitCost, product ids, stock, owner ids or the share token itself.
 */

export const SHAREABLE_INVOICE_STATUSES = ['UNPAID', 'PAID'] as const

const SHARE_TOKEN_PATTERN = /^[a-f0-9]{64}$/
const SHARE_PATH_PATTERN = /^\/shared\/invoice\/[a-f0-9]{64}$/

/** Drafts can still change, so only issued invoices (Otvoreno / Plaćeno) get a public link. */
export function isShareableInvoiceStatus(status: unknown): boolean {
  return (SHAREABLE_INVOICE_STATUSES as readonly unknown[]).includes(status)
}

export function isShareToken(value: unknown): value is string {
  return typeof value === 'string' && SHARE_TOKEN_PATTERN.test(value)
}

export function invoiceSharePath(token: string): string {
  return `/shared/invoice/${token}`
}

export function getSafeInvoiceSharePath(value: unknown): string | null {
  return typeof value === 'string' && SHARE_PATH_PATTERN.test(value) ? value : null
}

export const publicInvoiceSelect = {
  invoiceNumber: true,
  createdAt: true,
  dueDate: true,
  clientName: true,
  clientAddress: true,
  clientPib: true,
  status: true,
  totalAmount: true,
  vatEnabled: true,
  vatAmount: true,
  documentType: true,
  profile: {
    select: {
      companyName: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      pib: true,
      giroAccount: true,
      logoUrl: true,
    },
  },
  items: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      productName: true,
      quantity: true,
      unitPrice: true,
      discount: true,
      vatRate: true,
      total: true,
    },
  },
} as const

/** JSON wire shape of `publicInvoiceSelect` (Decimals and dates arrive as strings). */
export type PublicInvoice = {
  invoiceNumber: string
  createdAt: string
  dueDate: string
  clientName: string
  clientAddress: string | null
  clientPib: string | null
  status: (typeof SHAREABLE_INVOICE_STATUSES)[number]
  totalAmount: string
  vatEnabled: boolean
  vatAmount: string
  documentType: 'INVOICE' | 'PROFORMA'
  profile: {
    companyName: string | null
    contactEmail: string | null
    contactPhone: string | null
    address: string | null
    pib: string | null
    giroAccount: string | null
    logoUrl: string | null
  }
  items: Array<{
    id: string
    productName: string
    quantity: number
    unitPrice: string
    discount: string
    vatRate: string
    total: string
  }>
}
