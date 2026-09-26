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
  status: InvoiceStatus
  totalAmount: Decimal
  paidAt: Date | null
  profileId: string
  items?: InvoiceItem[]
  profile?: {
    id: string
    companyName: string | null
    contactEmail: string | null
    contactPhone: string | null
    address: string | null
    logoUrl: string | null
  }
}

export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[]
}

export type InvoiceCreateInput = {
  invoiceNumber?: string
  dueDate: string | Date
  clientName: string
  clientAddress?: string
  status?: InvoiceStatus
  items: {
    productId?: string | null
    productName: string
    quantity: number
    unitPrice: number
    discount?: number
    total: number
  }[]
}
