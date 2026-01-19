import { Decimal } from '@prisma/client/runtime/library'
import { Product } from './product'

export type CatalogItem = {
  id: string
  originalPrice: Decimal
  discountedPrice: Decimal
  sortOrder: number
  createdAt: Date
  catalogId: string
  productId: string
  product?: Product
}

export type Catalog = {
  id: string
  name: string
  clientName: string | null
  discount: Decimal
  notes: string | null
  createdAt: Date
  updatedAt: Date
  profileId: string
  items?: CatalogItem[]
}

export type CatalogWithItems = Catalog & {
  items: (CatalogItem & {
    product: Product
  })[]
}

export type CatalogCreateInput = {
  name: string
  clientName?: string | null
  discount: number
  notes?: string | null
  productIds: string[]
}

export type CatalogUpdateInput = Partial<CatalogCreateInput>
