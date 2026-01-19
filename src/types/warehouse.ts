import { MovementType } from '@prisma/client'

export type StockMovement = {
  id: string
  type: MovementType
  quantity: number
  reason: string
  createdAt: Date
  profileId: string
  productId: string
  product: {
    id: string
    name: string
    sku: string
  }
}

export type StockMovementCreateInput = {
  productId: string
  type: MovementType
  quantity: number
  reason: string
}

export type LowStockProduct = {
  id: string
  name: string
  sku: string
  quantity: number
  minStock: number
  imageUrl: string | null
}
