import { randomUUID } from 'node:crypto'
import { MovementType, Prisma, StockMovementSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { lockIntakeSku } from '@/lib/product-intake'

export const BULK_ADJUST_REASON = 'Korekcija stanja (CSV uvoz)'
export const SKU_MISSING_ERROR = 'SKU ne postoji'
export const SKU_AMBIGUOUS_ERROR = 'nejasno — više proizvoda sa ovim SKU-om'

export type StockAdjustSuccess = {
  ok: true
  sku: string
  productId: string
  previousQuantity: number
  quantity: number
  delta: number
  type: MovementType | null
}

export type StockAdjustFailure = {
  ok: false
  sku: string
  error: typeof SKU_MISSING_ERROR | typeof SKU_AMBIGUOUS_ERROR
}

export type StockAdjustResult = StockAdjustSuccess | StockAdjustFailure

export async function adjustStockToQuantity(
  profileId: string,
  sku: string,
  quantity: number
): Promise<StockAdjustResult> {
  return prisma.$transaction(
    async (tx) => {
      await lockIntakeSku(tx, profileId, sku)
      const matches = await tx.product.findMany({
        where: { profileId, sku },
        select: { id: true, quantity: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })

      if (matches.length === 0) {
        return { ok: false, sku, error: SKU_MISSING_ERROR }
      }
      if (matches.length > 1) {
        return { ok: false, sku, error: SKU_AMBIGUOUS_ERROR }
      }

      const product = matches[0]
      const delta = quantity - product.quantity
      if (delta === 0) {
        return {
          ok: true,
          sku,
          productId: product.id,
          previousQuantity: product.quantity,
          quantity,
          delta: 0,
          type: null,
        }
      }

      const type = delta > 0 ? MovementType.IN : MovementType.OUT
      await tx.stockMovement.create({
        data: {
          type,
          quantity: Math.abs(delta),
          reason: BULK_ADJUST_REASON,
          source: StockMovementSource.MANUAL,
          sourceKey: `bulk-adjust:${randomUUID()}`,
          profileId,
          productId: product.id,
        },
      })
      await tx.product.update({
        where: { id: product.id },
        data: { quantity },
      })

      return {
        ok: true,
        sku,
        productId: product.id,
        previousQuantity: product.quantity,
        quantity,
        delta,
        type,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 10000 }
  )
}
