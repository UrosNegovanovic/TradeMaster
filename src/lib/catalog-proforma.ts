import { DEFAULT_VAT_RATE } from '@/lib/invoice-vat'
import type { InvoiceCopyPrefill, CopyProduct } from '@/lib/invoice-copy'
import { pickerProductForId } from '@/lib/product-picker'
import { clientToInvoiceFields, findClientByName } from '@/lib/client-fill'
import type { Client } from '@/types/client'

type Amount = number | string | { toString(): string }

export type CatalogProformaSource = {
  clientName: string | null
  discount: Amount
  /** In the catalog's manual order (sortOrder), as the buyer saw them. */
  items: Array<{ productId: string; product?: { name: string; price: Amount | null } | null }>
}

/**
 * "Napravi predračun" on a catalog (ROADMAP A9.15): the catalog's buyer and products become a predračun
 * with 1 piece each, today's sale price and the catalog discount per line. Prices are not frozen in the
 * catalog, so the predračun takes them from Asortiman (newest row of the SKU). A product with no price
 * ("Cena na upit") keeps price 0 and the owner types it in. A saved buyer with the same name adds PIB and address.
 */
export function proformaFromCatalogPrefill(
  catalog: CatalogProformaSource,
  products: CopyProduct[],
  clients: Array<Pick<Client, 'name' | 'pib' | 'address'>>,
  vatEnabled: boolean
): InvoiceCopyPrefill {
  const buyerName = catalog.clientName?.trim() ?? ''
  const savedBuyer = buyerName ? findClientByName(clients, buyerName) : undefined
  const buyer = savedBuyer ? clientToInvoiceFields(savedBuyer) : { clientName: buyerName, clientPib: '', clientAddress: '' }
  const discount = Math.min(100, Math.max(0, Number(catalog.discount) || 0))

  return {
    ...buyer,
    items: catalog.items.flatMap((item) => {
      const product = pickerProductForId(products, item.productId)
      const name = product?.name ?? item.product?.name
      if (!name) return []
      const price = Number(product?.price ?? item.product?.price ?? 0)
      return [
        {
          productId: product?.id ?? null,
          productName: name,
          quantity: 1,
          unitPrice: Number.isFinite(price) && price > 0 ? price : 0,
          discount,
          vatRate: vatEnabled ? DEFAULT_VAT_RATE : 0,
        },
      ]
    }),
  }
}

export function catalogProformaHref(catalogId: string): string {
  return `/invoices/new?${new URLSearchParams({ type: 'proforma', fromCatalog: catalogId }).toString()}`
}
