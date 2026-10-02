import { Decimal } from '@prisma/client/runtime/library'
import { Product } from './product'
import type { CatalogDisplaySettings } from '@/lib/catalog-layout'

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
} & Partial<CatalogDisplaySettings>

export type CatalogWithItems = Catalog & {
  items: (CatalogItem & {
    // Owner API selects only the category name
    product: Omit<Product, 'category'> & { category?: { name: string } | null }
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
