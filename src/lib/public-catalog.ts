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

const SHARE_PATH_PATTERN = /^\/shared\/catalog\/[a-f0-9]{64}$/
const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/
const PHONE_PATTERN = /^\+?[0-9 ()-]{3,30}$/

export function getSafeCatalogSharePath(value: unknown): string | null {
  return typeof value === 'string' && SHARE_PATH_PATTERN.test(value) ? value : null
}

export function getSafeEmailHref(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 254 || !EMAIL_PATTERN.test(value)) return null
  return `mailto:${value}`
}

export function getSafePhoneHref(value: unknown): string | null {
  if (typeof value !== 'string' || !PHONE_PATTERN.test(value)) return null
  const normalized = value.replace(/[^+0-9]/g, '')
  return normalized.length >= 3 ? `tel:${normalized}` : null
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
