import { MovementType, Prisma, StockMovementSource } from '@prisma/client'
import {
  INTAKE_REASON,
  intakeSourceKey,
  invoiceSourceKey,
  invoiceStockReason,
} from '@/lib/invoice-stock'

type BackfillDb = {
  $queryRaw: <T>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<T>
  $executeRaw: (query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<unknown>
  stockMovement: {
    findUnique: (args: {
      where: {
        profileId_source_sourceKey: {
          profileId: string
          source: StockMovementSource
          sourceKey: string
        }
      }
      select: { id: true }
    }) => Promise<{ id: string } | null>
    create: (args: { data: Prisma.StockMovementUncheckedCreateInput }) => Promise<unknown>
  }
  product: {
    update: (args: {
      where: { id: string }
      data: { quantity: number }
    }) => Promise<unknown>
  }
}

type IntakeReceiptRow = {
  profileId: string
  key: string
  createdAt: Date
  productId: string | null
  quantity: number | null
}

type InvoiceDueRow = {
  invoiceId: string
  invoiceNumber: string
  profileId: string
  productId: string
  quantity: number
  createdAt: Date
  productQuantity: number
}

export async function backfillMissingStockMovements(db: BackfillDb) {
  const receipts = await db.$queryRaw<IntakeReceiptRow[]>`
    SELECT
      pi."profileId" AS "profileId",
      pi.key,
      pi."createdAt" AS "createdAt",
      pi.response->>'id' AS "productId",
      COALESCE(
        NULLIF(pi.response->>'quantityAdded', '')::int,
        NULLIF(pi.response->>'quantity', '')::int
      ) AS quantity
    FROM product_intakes pi
    WHERE pi.response->>'id' IS NOT NULL
  `

  let intakeCreated = 0
  for (const receipt of receipts) {
    if (!receipt.productId || !receipt.quantity || receipt.quantity < 1) continue
    const sourceKey = intakeSourceKey(receipt.key)
    const existing = await db.stockMovement.findUnique({
      where: {
        profileId_source_sourceKey: {
          profileId: receipt.profileId,
          source: StockMovementSource.INTAKE,
          sourceKey,
        },
      },
      select: { id: true },
    })
    if (existing) continue
    await db.stockMovement.create({
      data: {
        type: MovementType.IN,
        quantity: receipt.quantity,
        reason: INTAKE_REASON,
        source: StockMovementSource.INTAKE,
        sourceKey,
        createdAt: receipt.createdAt,
        profileId: receipt.profileId,
        productId: receipt.productId,
      },
    })
    intakeCreated += 1
  }

  const dues = await db.$queryRaw<InvoiceDueRow[]>`
    SELECT
      i.id AS "invoiceId",
      i."invoiceNumber" AS "invoiceNumber",
      i."profileId" AS "profileId",
      ii."productId" AS "productId",
      SUM(ii.quantity)::int AS quantity,
      MIN(i."createdAt") AS "createdAt",
      p.quantity AS "productQuantity"
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii."invoiceId"
    JOIN products p ON p.id = ii."productId"
    WHERE i.status <> 'DRAFT' AND ii."productId" IS NOT NULL
    GROUP BY i.id, i."invoiceNumber", i."profileId", ii."productId", p.quantity
  `

  let invoiceCreated = 0
  const deductedByProduct = new Map<string, { quantity: number; next: number }>()

  for (const due of dues) {
    const sourceKey = invoiceSourceKey(due.invoiceId, due.productId)
    const existing = await db.stockMovement.findUnique({
      where: {
        profileId_source_sourceKey: {
          profileId: due.profileId,
          source: StockMovementSource.INVOICE,
          sourceKey,
        },
      },
      select: { id: true },
    })
    if (existing) continue

    await db.stockMovement.create({
      data: {
        type: MovementType.OUT,
        quantity: due.quantity,
        reason: invoiceStockReason(due.invoiceNumber),
        source: StockMovementSource.INVOICE,
        sourceKey,
        createdAt: due.createdAt,
        profileId: due.profileId,
        productId: due.productId,
        invoiceId: due.invoiceId,
      },
    })
    invoiceCreated += 1

    const tracked = deductedByProduct.get(due.productId) ?? {
      quantity: due.productQuantity,
      next: due.productQuantity,
    }
    tracked.next = Math.max(0, tracked.next - due.quantity)
    deductedByProduct.set(due.productId, tracked)
  }

  for (const [productId, change] of deductedByProduct) {
    if (change.next === change.quantity) continue
    await db.product.update({
      where: { id: productId },
      data: { quantity: change.next },
    })
  }

  return { intakeCreated, invoiceCreated }
}
