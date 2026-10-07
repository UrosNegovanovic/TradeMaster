import { DEFAULT_VAT_RATE } from '@/lib/invoice-vat'
import { pickerProductForId, type PickerProduct } from '@/lib/product-picker'

type Amount = number | string | { toString(): string }

export type CopySourceItem = {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: Amount
  discount: Amount
  vatRate: Amount
}

export type CopySource = {
  clientName: string
  clientAddress: string | null
  clientPib: string | null
  vatEnabled: boolean
  items: CopySourceItem[]
}

export type CopyProduct = PickerProduct & { name: string; price: Amount | null }

export type InvoiceCopyPrefill = {
  clientName: string
  clientAddress: string
  clientPib: string
  items: {
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    discount: number
    vatRate: number
  }[]
}

/**
 * "Kopiraj" (ROADMAP A5): a new document with the same buyer, products and quantities.
 * Products that still exist take today's name and sale price (newest row of the SKU);
 * a line whose product is gone, or has no sale price, keeps the old text and price.
 * Costs are not copied: the server snapshots today's cost when the new document is saved.
 */
export function invoiceCopyPrefill(
  source: CopySource,
  products: CopyProduct[],
  vatEnabled: boolean
): InvoiceCopyPrefill {
  return {
    clientName: source.clientName,
    clientAddress: source.clientAddress ?? '',
    clientPib: source.clientPib ?? '',
    items: source.items.map((item) => {
      const product = pickerProductForId(products, item.productId)
      const todayPrice = product ? Number(product.price) : NaN
      const oldPrice = Number(item.unitPrice)
      return {
        productId: product?.id ?? null,
        productName: product?.name ?? item.productName,
        quantity: item.quantity,
        unitPrice: Number.isFinite(todayPrice) && todayPrice > 0 ? todayPrice : oldPrice,
        discount: Number(item.discount) || 0,
        vatRate: !vatEnabled ? 0 : source.vatEnabled ? Number(item.vatRate) : DEFAULT_VAT_RATE,
      }
    }),
  }
}

/** New-document page prefilled from `invoice`, same document type. */
export function invoiceCopyHref(invoice: { id: string; documentType?: 'INVOICE' | 'PROFORMA' }): string {
  const params = new URLSearchParams({ copyFrom: invoice.id })
  if (invoice.documentType === 'PROFORMA') params.set('type', 'proforma')
  return `/invoices/new?${params.toString()}`
}
