import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recordIntakeMovement } from '@/lib/invoice-stock'
import type { ProductIntakeData } from '@/lib/validations'

export class IntakeConflictError extends Error {}

export async function lockIntakeSku(
  tx: { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  profileId: string,
  sku: string
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['intake-sku', profileId, sku])}, 0))`
}

/** Serialize intake per company/SKU. Repeat scans update the latest row for that SKU. */
export async function saveProductIntake(profileId: string, input: ProductIntakeData, key: string | null) {
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  return prisma.$transaction(async (tx) => {
    // Transaction-scoped locks also work through a transaction-mode pooler.
    // Take the request lock first, so key reuse with another SKU cannot race.
    if (key) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['intake-key', profileId, key])}, 0))`
      const receipt = await tx.productIntake.findUnique({ where: { profileId_key: { profileId, key } } })
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw new IntakeConflictError('Idempotency key already used for another request')
        return { body: receipt.response, status: receipt.status, image: null }
      }
    }
    await lockIntakeSku(tx, profileId, input.sku)
    const include = { category: { select: { id: true, name: true } } }
    const existing = await tx.product.findFirst({
      where: { profileId, sku: input.sku },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    const imageUrl = input.imageUrl || null
    const product = existing
      ? await tx.product.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: input.quantity },
            ...(input.price > 0 ? { price: input.price } : {}),
            ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
            ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
            ...(!existing.imageUrl && imageUrl ? { imageUrl } : {}),
          },
          include,
        })
      : await tx.product.create({
          data: {
            profileId, name: input.name, sku: input.sku, price: input.price,
            costPrice: input.costPrice ?? null,
            quantity: input.quantity, description: input.description || null,
            imageUrl, categoryId: input.categoryId ?? null,
          },
          include,
        })
    await recordIntakeMovement(tx, {
      profileId,
      productId: product.id,
      quantity: input.quantity,
      key,
    })
    const payload = existing
      ? { ...product, action: 'updated', quantityAdded: input.quantity, previousQuantity: product.quantity - input.quantity }
      : { ...product, action: 'created' }
    // Store the wire representation, including decimal/date serialization.
    const body = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonObject
    const status = existing ? 200 : 201
    if (key) {
      await tx.productIntake.create({ data: { profileId, key, fingerprint, response: body, status } })
    }
    return { body, status, image: { id: product.id, url: product.imageUrl } }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 10000 })
}
