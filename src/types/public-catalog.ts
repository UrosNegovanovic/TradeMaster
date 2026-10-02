import type { CatalogDisplaySettings } from '@/lib/catalog-layout'

/** Public wire DTO, separate from the owner's Prisma-backed catalog type. */
export interface PublicCatalog {
  name: string
  clientName: string | null
  notes: string | null
  discount: string
  /** Missing on responses cached before display settings existed; read with readCatalogDisplay. */
  display?: Partial<CatalogDisplaySettings>
  profile: {
    companyName: string | null
    contactEmail: string | null
    contactPhone: string | null
    address: string | null
    logoUrl: string | null
  }
  items: {
    id: string
    originalPrice: string
    discountedPrice: string
    sortOrder?: number
    product: {
      name: string
      sku: string | null
      description: string | null
      imageUrl: string | null
      categoryName?: string | null
    } | null
  }[]
}
