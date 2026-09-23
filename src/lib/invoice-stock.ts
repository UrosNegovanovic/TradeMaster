import { randomUUID } from 'node:crypto'
import { MovementType, Prisma, StockMovementSource } from '@prisma/client'
import { InvoiceClientError } from '@/lib/invoice-service'

export const INTAKE_REASON = 'Ulaz robe'

export type InvoiceStockItem = {
  productId?: string | null
  quantity: number
}

export type InvoiceStockTx = {
  $executeRaw: (query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<unknown>
  product: {
    findMany: (args: {
      where: { id: { in: string[] }; profileId: string }
      select: { id: true; name: true; quantity: true }
    }) => Promise<Array<{ id: string; name: string; quantity: number }>>
    update: (args: {
      where: { id: string }
      data: { quantity: { increment: number } | { decrement: number } }
    }) => Promise<unknown>
  }
  stockMovement: {
    findMany: (args: {
      where: {
        profileId: string
        invoiceId?: string
        source?: StockMovementSource
        sourceKey?: string
      }
    }) => Promise<
      Array<{
        id: string
        productId: string
        quantity: number
        reason: string
        sourceKey: string | null
      }>
    >
    create: (args: { data: Prisma.StockMovementCreateInput }) => Promise<unknown>
    update: (args: {
      where: { id: string }
      data: { quantity?: number; reason?: string }
    }) => Promise<unknown>
    delete: (args: { where: { id: string } }) => Promise<unknown>
  }
}

export function isInvoiceStockActive(status: string | null | undefined): boolean {
  return status === 'UNPAID' || status === 'PAID'
}

export function invoiceStockReason(invoiceNumber: string): string {
  return `Faktura ${invoiceNumber}`
}

export function intakeSourceKey(key: string): string {
  return `intake:${key}`
}

export function invoiceSourceKey(invoiceId: string, productId: string): string {
  return `invoice:${invoiceId}:${productId}`
}

export function insufficientStockMessage(name: string, needed: number, available: number): string {
  return `Nema dovoljno na stanju za „${name}“. Traženo: ${needed} kom, na stanju: ${available} kom.`
}

export function desiredInvoiceQuantities(items: InvoiceStockItem[]): Map<string, number> {
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (!item.productId) continue
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }
  return quantities
}

export async function recordIntakeMovement(
  tx: Pick<InvoiceStockTx, 'stockMovement'>,
  input: { profileId: string; productId: string; quantity: number; key: string | null }
) {
  await tx.stockMovement.create({
    data: {
      type: MovementType.IN,
      quantity: input.quantity,
      reason: INTAKE_REASON,
      source: StockMovementSource.INTAKE,
      sourceKey: intakeSourceKey(input.key ?? randomUUID()),
      profile: { connect: { id: input.profileId } },
      product: { connect: { id: input.productId } },
    },
  })
}

export async function syncInvoiceStock(
  tx: InvoiceStockTx,
  input: {
    profileId: string
    invoiceId: string
    invoiceNumber: string
    status: string
    items: InvoiceStockItem[]
  }
) {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['invoice-stock', input.profileId, input.invoiceId])}, 0))`
  )

  const desired = isInvoiceStockActive(input.status)
    ? desiredInvoiceQuantities(input.items)
    : new Map<string, number>()

  const existing = await tx.stockMovement.findMany({
    where: {
      profileId: input.profileId,
      invoiceId: input.invoiceId,
      source: StockMovementSource.INVOICE,
    },
  })
  const existingByProduct = new Map(existing.map((movement) => [movement.productId, movement]))
  const productIds = [...new Set([...desired.keys(), ...existingByProduct.keys()])]
  if (productIds.length === 0) {
    return
  }

  for (const productId of productIds) {
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM products WHERE id = ${productId} AND "profileId" = ${input.profileId} FOR UPDATE`
    )
  }

  const products = await tx.product.findMany({
    where: { id: { in: productIds }, profileId: input.profileId },
    select: { id: true, name: true, quantity: true },
  })
  const productById = new Map(products.map((product) => [product.id, product]))
  const reason = invoiceStockReason(input.invoiceNumber)

  for (const productId of productIds) {
    const want = desired.get(productId) ?? 0
    const current = existingByProduct.get(productId)
    const have = current?.quantity ?? 0
    const delta = want - have
    const product = productById.get(productId)

    if (!product) {
      if (want > 0) {
        throw new InvoiceClientError(
          'One or more products not found or do not belong to you',
          400
        )
      }
      if (current) {
        await tx.stockMovement.delete({ where: { id: current.id } })
      }
      continue
    }

    if (delta > 0 && product.quantity < delta) {
      throw new InvoiceClientError(
        insufficientStockMessage(product.name, want, product.quantity + have),
        400
      )
    }

    if (want === 0) {
      if (current) {
        await tx.product.update({
          where: { id: productId },
          data: { quantity: { increment: current.quantity } },
        })
        await tx.stockMovement.delete({ where: { id: current.id } })
      }
      continue
    }

    if (!current) {
      await tx.stockMovement.create({
        data: {
          type: MovementType.OUT,
          quantity: want,
          reason,
          source: StockMovementSource.INVOICE,
          sourceKey: invoiceSourceKey(input.invoiceId, productId),
          profile: { connect: { id: input.profileId } },
          product: { connect: { id: productId } },
          invoice: { connect: { id: input.invoiceId } },
        },
      })
      await tx.product.update({
        where: { id: productId },
        data: { quantity: { decrement: want } },
      })
      continue
    }

    if (delta !== 0) {
      await tx.stockMovement.update({
        where: { id: current.id },
        data: { quantity: want, reason },
      })
      await tx.product.update({
        where: { id: productId },
        data: { quantity: { increment: -delta } },
      })
      continue
    }

    if (current.reason !== reason) {
      await tx.stockMovement.update({
        where: { id: current.id },
        data: { reason },
      })
    }
  }
}
