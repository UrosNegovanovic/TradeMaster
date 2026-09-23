import { prisma } from '@/lib/prisma'

export type LowStockSourceProduct = {
  id: string
  name: string
  sku: string
  quantity: number
  minStock: number
  imageUrl: string | null
  createdAt: Date | string
}

export type LowStockProduct = {
  id: string
  name: string
  sku: string
  quantity: number
  minStock: number
  imageUrl: string | null
}

/**
 * Same SKU rollup Magacin uses: daily batches share one SKU, so alerts
 * compare the summed quantity to the most recent row's minStock.
 */
export function aggregateLowStock(products: LowStockSourceProduct[]): LowStockProduct[] {
  const productMap = new Map<string, LowStockSourceProduct & { totalQuantity: number }>()

  for (const product of products) {
    const existing = productMap.get(product.sku)

    if (existing) {
      const totalQuantity = existing.totalQuantity + product.quantity
      if (new Date(product.createdAt) > new Date(existing.createdAt)) {
        productMap.set(product.sku, { ...product, totalQuantity })
      } else {
        existing.totalQuantity = totalQuantity
      }
    } else {
      productMap.set(product.sku, {
        ...product,
        totalQuantity: product.quantity,
      })
    }
  }

  return Array.from(productMap.values())
    .filter((product) => product.totalQuantity <= product.minStock)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      quantity: product.totalQuantity,
      minStock: product.minStock,
      imageUrl: product.imageUrl,
    }))
    .sort((a, b) => {
      if (a.quantity !== b.quantity) {
        return a.quantity - b.quantity
      }
      return a.name.localeCompare(b.name)
    })
}

export async function fetchLowStockProducts(profileId: string): Promise<LowStockProduct[]> {
  const products = await prisma.product.findMany({
    where: { profileId },
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      minStock: true,
      imageUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return aggregateLowStock(products)
}
