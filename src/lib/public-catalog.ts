import { readCatalogDisplay, type CatalogDisplaySettings } from './catalog-layout'

/** Fields a guest may see on an unlisted share link. Omits inventory, ids of other tenants, and live product price. */
export type PublicCatalogBody = {
  name: string
  clientName: string | null
  discount: unknown
  notes: string | null
  display: CatalogDisplaySettings
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
      /** null when the owner hid SKUs in this catalog */
      sku: string | null
      imageUrl: string | null
      /** null when the owner hid descriptions in this catalog */
      description: string | null
      categoryName: string | null
    } | null
  }>
}

export type PublicCatalog = PublicCatalogBody & { id: string }

type CatalogRecord = {
  name: string
  clientName: string | null
  discount: unknown
  notes: string | null
  layout?: unknown
  groupByCategory?: unknown
  sortMode?: unknown
  showSku?: unknown
  showDescription?: unknown
  showOriginalPrice?: unknown
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
      category?: { name: string } | null
    } | null
  }>
}

/** Prisma select for the public DTO. Never add costPrice, quantity, price or owner ids here. */
export const publicCatalogSelect = {
  name: true,
  clientName: true,
  discount: true,
  notes: true,
  layout: true,
  groupByCategory: true,
  sortMode: true,
  showSku: true,
  showDescription: true,
  showOriginalPrice: true,
  profile: {
    select: { companyName: true, contactEmail: true, contactPhone: true, address: true, logoUrl: true },
  },
  items: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      originalPrice: true,
      discountedPrice: true,
      sortOrder: true,
      product: {
        select: { name: true, sku: true, imageUrl: true, description: true, category: { select: { name: true } } },
      },
    },
  },
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

export function toPublicCatalogBody(catalog: CatalogRecord): PublicCatalogBody {
  const display = readCatalogDisplay(catalog)
  return {
    name: catalog.name,
    clientName: catalog.clientName,
    discount: catalog.discount,
    notes: catalog.notes,
    display,
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
            sku: display.showSku ? item.product.sku : null,
            imageUrl: item.product.imageUrl,
            description: display.showDescription ? item.product.description : null,
            categoryName: item.product.category?.name ?? null,
          }
        : null,
    })),
  }
}

export function toPublicCatalog(catalog: CatalogRecord & { id: string }): PublicCatalog {
  return { id: catalog.id, ...toPublicCatalogBody(catalog) }
}
