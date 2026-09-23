import { describe, expect, it, vi } from 'vitest'
import { MovementType, StockMovementSource } from '@prisma/client'
import { backfillMissingStockMovements } from '@/lib/stock-backfill'
import { intakeSourceKey, invoiceSourceKey } from '@/lib/invoice-stock'

describe('backfillMissingStockMovements', () => {
  it('writes missing intake IN and invoice OUT once, then no-ops', async () => {
    const created: Array<Record<string, unknown>> = []
    const product = { id: 'p1', quantity: 7 }
    const receipts = [
      {
        profileId: 'prof',
        key: 'scan-1',
        createdAt: new Date('2026-09-23T12:00:00Z'),
        productId: 'p1',
        quantity: 7,
      },
    ]
    const dues = [
      {
        invoiceId: 'inv-1',
        invoiceNumber: '04/2026',
        profileId: 'prof',
        productId: 'p1',
        quantity: 3,
        createdAt: new Date('2026-09-23T12:05:00Z'),
        productQuantity: 7,
      },
    ]

    const existing = new Set<string>()
    const db = {
      $queryRaw: vi.fn(async (query: { strings?: string[] } | TemplateStringsArray) => {
        const text = Array.isArray(query) ? query.join(' ') : String(query)
        if (text.includes('product_intakes')) return receipts
        return dues
      }),
      $executeRaw: vi.fn(),
      stockMovement: {
        findUnique: async ({
          where,
        }: {
          where: { profileId_source_sourceKey: { sourceKey: string } }
        }) => (existing.has(where.profileId_source_sourceKey.sourceKey) ? { id: 'x' } : null),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data)
          existing.add(String(data.sourceKey))
          return data
        },
      },
      product: {
        update: async ({ where, data }: { where: { id: string }; data: { quantity: number } }) => {
          if (where.id === product.id) product.quantity = data.quantity
          return product
        },
      },
    }

    const first = await backfillMissingStockMovements(db as never)
    const second = await backfillMissingStockMovements(db as never)

    expect(first).toEqual({ intakeCreated: 1, invoiceCreated: 1 })
    expect(second).toEqual({ intakeCreated: 0, invoiceCreated: 0 })
    expect(created).toHaveLength(2)
    expect(created[0]).toMatchObject({
      type: MovementType.IN,
      quantity: 7,
      source: StockMovementSource.INTAKE,
      sourceKey: intakeSourceKey('scan-1'),
    })
    expect(created[1]).toMatchObject({
      type: MovementType.OUT,
      quantity: 3,
      source: StockMovementSource.INVOICE,
      sourceKey: invoiceSourceKey('inv-1', 'p1'),
      reason: 'Faktura 04/2026',
    })
    expect(product.quantity).toBe(4)
  })
})
