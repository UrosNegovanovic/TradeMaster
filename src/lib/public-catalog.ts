/** Fields a guest may see on an unlisted share link. Omits inventory, ids of other tenants, and live product price. */
export type PublicCatalog = {
  id: string
  name: string
  clientName: string | null
  discount: unknown
  notes: string | null
  profile: {
    companyName: string | null
    contactEmail: string | null
    contactPhone: string | null
    address: string | null
    logoUrl: string | null
  }
  items: Array<{
    id: string
    originalPrice: unknown
    discountedPrice: unknown
    sortOrder: number
    product: {
      name: string
      sku: string
      imageUrl: string | null
      description: string | null
    } | null
  }>
}

type CatalogRecord = {
  id: string
  name: string
  clientName: string | null
  discount: unknown
  notes: string | null
  profile: {
    companyName: string | null
    contactEmail: string | null
    contactPhone: string | null
    address: string | null
    logoUrl: string | null
  }
  items: Array<{
    id: string
    originalPrice: unknown
    discountedPrice: unknown
    sortOrder: number
    product: {
      name: string
      sku: string
      imageUrl: string | null
      description: string | null
    } | null
  }>
}

export function toPublicCatalog(catalog: CatalogRecord): PublicCatalog {
  return {
    id: catalog.id,
    name: catalog.name,
    clientName: catalog.clientName,
    discount: catalog.discount,
    notes: catalog.notes,
    profile: {
      companyName: catalog.profile.companyName,
      contactEmail: catalog.profile.contactEmail,
      contactPhone: catalog.profile.contactPhone,
      address: catalog.profile.address,
      logoUrl: catalog.profile.logoUrl,
    },
    items: catalog.items.map((item) => ({
      id: item.id,
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
      sortOrder: item.sortOrder,
      product: item.product
        ? {
            name: item.product.name,
            sku: item.product.sku,
            imageUrl: item.product.imageUrl,
            description: item.product.description,
          }
        : null,
    })),
  }
}
