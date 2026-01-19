import { Decimal } from '@prisma/client/runtime/library'

export type Product = {
  id: string
  name: string
  sku: string
  price: Decimal
  imageUrl: string | null
  description: string | null
  quantity: number
  minStock: number
  createdAt: Date
  updatedAt: Date
  profileId: string
  categoryId: string | null
  category?: {
    id: string
    name: string
  } | null
}

export type ProductCreateInput = {
  name: string
  sku: string
  price: number
  imageUrl?: string | null
  description?: string | null
  categoryId?: string | null
}

export type ProductUpdateInput = Partial<ProductCreateInput>
