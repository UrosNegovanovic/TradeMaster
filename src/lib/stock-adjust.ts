import { randomUUID } from 'node:crypto'
import { MovementType, Prisma, StockMovementSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { lockIntakeSku } from '@/lib/product-intake'

export const BULK_ADJUST_REASON = 'Korekcija stanja (CSV uvoz)'
export const SKU_MISSING_ERROR = 'SKU ne postoji'

export type StockAdjustSuccess = {
  ok: true
  sku: string
  productId: string
  previousQuantity: number
  quantity: number
  delta: number
  type: MovementType | null
  leftoverRowsZeroed: number
}

export type StockAdjustFailure = {
  ok: false
  sku: string
  error: typeof SKU_MISSING_ERROR
}

export type StockAdjustResult = StockAdjustSuccess | StockAdjustFailure

/**
 * SET quantity for a SKU. Leftover daily-batch rows keep their ids (invoices/catalogs
 * may still point at them) but stock is moved onto the newest row so CSV correction
 * is not blocked by “ambiguous SKU”.
 */
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

      const canonical = matches[0]
      const leftovers = matches.slice(1)
      const previousQuantity = matches.reduce((sum, row) => sum + row.quantity, 0)
      const delta = quantity - previousQuantity
      const leftoversWithStock = leftovers.filter((row) => row.quantity !== 0)

      if (delta === 0 && leftoversWithStock.length === 0) {
        return {
          ok: true,
          sku,
          productId: canonical.id,
          previousQuantity,
          quantity,
          delta: 0,
          type: null,
          leftoverRowsZeroed: 0,
        }
      }

      if (delta !== 0) {
        const type = delta > 0 ? MovementType.IN : MovementType.OUT
        await tx.stockMovement.create({
          data: {
            type,
            quantity: Math.abs(delta),
            reason: BULK_ADJUST_REASON,
            source: StockMovementSource.MANUAL,
            sourceKey: `bulk-adjust:${randomUUID()}`,
            profileId,
            productId: canonical.id,
          },
        })
      }

      await tx.product.update({
        where: { id: canonical.id },
        data: { quantity },
      })

      if (leftoversWithStock.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: leftoversWithStock.map((row) => row.id) } },
          data: { quantity: 0 },
        })
      }

      return {
        ok: true,
        sku,
        productId: canonical.id,
        previousQuantity,
        quantity,
        delta,
        type: delta === 0 ? null : delta > 0 ? MovementType.IN : MovementType.OUT,
        leftoverRowsZeroed: leftoversWithStock.length,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 10000 }
  )
}
