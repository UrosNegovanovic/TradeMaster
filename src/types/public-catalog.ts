/** Public wire DTO, separate from the owner's Prisma-backed catalog type. */
export interface PublicCatalog {
  name: string
  clientName: string | null
  notes: string | null
  discount: string
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
    product: { name: string; sku: string; description: string | null; imageUrl: string | null }
  }[]
}
