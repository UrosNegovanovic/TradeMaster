import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MovementType, StockMovementSource } from '@prisma/client'
import { InvoiceClientError } from '@/lib/invoice-service'
import {
  desiredInvoiceQuantities,
  insufficientStockMessage,
  invoiceSourceKey,
  invoiceStockReason,
  isInvoiceStockActive,
  recordIntakeMovement,
  syncInvoiceStock,
  type InvoiceStockTx,
} from '@/lib/invoice-stock'

function createTx(seed?: {
  products?: Array<{ id: string; name: string; quantity: number }>
  movements?: Array<{
    id: string
    productId: string
    quantity: number
    reason: string
    sourceKey: string | null
  }>
}) {
  const products = new Map(
    (seed?.products ?? [{ id: 'p1', name: 'Sok', quantity: 7 }]).map((product) => [
      product.id,
      { ...product },
    ])
  )
  const movements = [...(seed?.movements ?? [])]
  const tx: InvoiceStockTx & { products: typeof products; movements: typeof movements } = {
    products,
    movements,
    $executeRaw: vi.fn().mockResolvedValue(1),
    product: {
      findMany: async ({ where }) =>
        where.id.in
          .map((id) => products.get(id))
          .filter((product): product is { id: string; name: string; quantity: number } =>
            Boolean(product)
          ),
      update: async ({ where, data }) => {
        const product = products.get(where.id)
        if (!product) throw new Error('missing product')
        if ('increment' in data.quantity) product.quantity += data.quantity.increment
        if ('decrement' in data.quantity) product.quantity -= data.quantity.decrement
        return product
      },
    },
    stockMovement: {
      findMany: async () => movements,
      create: async ({ data }) => {
        const row = {
          id: `m-${movements.length + 1}`,
          productId: String(
            (data as { product?: { connect?: { id?: string } }; productId?: string }).product
              ?.connect?.id ??
              (data as { productId?: string }).productId
          ),
          quantity: Number((data as { quantity: number }).quantity),
          reason: String((data as { reason: string }).reason),
          sourceKey: ((data as { sourceKey?: string | null }).sourceKey ?? null) as string | null,
        }
        movements.push(row)
        return row
      },
      update: async ({ where, data }) => {
        const row = movements.find((movement) => movement.id === where.id)
        if (!row) throw new Error('missing movement')
        if (data.quantity !== undefined) row.quantity = data.quantity
        if (data.reason !== undefined) row.reason = data.reason
        return row
      },
      delete: async ({ where }) => {
        const index = movements.findIndex((movement) => movement.id === where.id)
        if (index >= 0) movements.splice(index, 1)
        return { id: where.id }
      },
    },
  }
  return tx
}

describe('invoice stock rules', () => {
  it('treats issued and paid invoices as stock-active, drafts as not', () => {
    expect(isInvoiceStockActive('UNPAID')).toBe(true)
    expect(isInvoiceStockActive('PAID')).toBe(true)
    expect(isInvoiceStockActive('DRAFT')).toBe(false)
    expect(invoiceStockReason('04/2026')).toBe('Faktura 04/2026')
    expect(invoiceSourceKey('inv-1', 'p1')).toBe('invoice:inv-1:p1')
  })

  it('sums invoice lines per product and skips manual lines', () => {
    const quantities = desiredInvoiceQuantities([
      { productId: 'p1', quantity: 3 },
      { productId: 'p1', quantity: 2 },
      { productId: null, quantity: 8 },
    ])
    expect(quantities.get('p1')).toBe(5)
    expect(quantities.size).toBe(1)
  })

  it('writes an IN movement for intake without changing extra quantity', async () => {
    const tx = createTx()
    await recordIntakeMovement(tx, {
      profileId: 'prof',
      productId: 'p1',
      quantity: 7,
      key: 'scan-1',
    })
    expect(tx.movements).toHaveLength(1)
    expect(tx.movements[0]).toMatchObject({
      productId: 'p1',
      quantity: 7,
      reason: 'Ulaz robe',
    })
    expect(tx.products.get('p1')?.quantity).toBe(7)
  })
})

describe('syncInvoiceStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deducts stock and writes one OUT when an invoice leaves draft', async () => {
    const tx = createTx()
    await syncInvoiceStock(tx, {
      profileId: 'prof',
      invoiceId: 'inv-1',
      invoiceNumber: '04/2026',
      status: 'UNPAID',
      items: [{ productId: 'p1', quantity: 3 }],
    })
    expect(tx.products.get('p1')?.quantity).toBe(4)
    expect(tx.movements).toEqual([
      expect.objectContaining({
        productId: 'p1',
        quantity: 3,
        reason: 'Faktura 04/2026',
        sourceKey: 'invoice:inv-1:p1',
      }),
    ])
  })

  it('is idempotent on paid toggle and repeated sync of the same lines', async () => {
    const tx = createTx()
    const payload = {
      profileId: 'prof',
      invoiceId: 'inv-1',
      invoiceNumber: '04/2026',
      items: [{ productId: 'p1', quantity: 3 }],
    }
    await syncInvoiceStock(tx, { ...payload, status: 'UNPAID' })
    await syncInvoiceStock(tx, { ...payload, status: 'PAID' })
    await syncInvoiceStock(tx, { ...payload, status: 'PAID' })
    expect(tx.products.get('p1')?.quantity).toBe(4)
    expect(tx.movements).toHaveLength(1)
    expect(tx.movements[0].quantity).toBe(3)
  })

  it('adjusts an existing OUT when issued lines change', async () => {
    const tx = createTx({
      products: [{ id: 'p1', name: 'Sok', quantity: 4 }],
      movements: [
        {
          id: 'm1',
          productId: 'p1',
          quantity: 3,
          reason: 'Faktura 04/2026',
          sourceKey: 'invoice:inv-1:p1',
        },
      ],
    })
    await syncInvoiceStock(tx, {
      profileId: 'prof',
      invoiceId: 'inv-1',
      invoiceNumber: '04/2026',
      status: 'UNPAID',
      items: [{ productId: 'p1', quantity: 5 }],
    })
    expect(tx.products.get('p1')?.quantity).toBe(2)
    expect(tx.movements[0].quantity).toBe(5)
  })

  it('restores stock and removes the OUT on back-to-draft', async () => {
    const tx = createTx({
      products: [{ id: 'p1', name: 'Sok', quantity: 4 }],
      movements: [
        {
          id: 'm1',
          productId: 'p1',
          quantity: 3,
          reason: 'Faktura 04/2026',
          sourceKey: 'invoice:inv-1:p1',
        },
      ],
    })
    await syncInvoiceStock(tx, {
      profileId: 'prof',
      invoiceId: 'inv-1',
      invoiceNumber: '04/2026',
      status: 'DRAFT',
      items: [{ productId: 'p1', quantity: 3 }],
    })
    expect(tx.products.get('p1')?.quantity).toBe(7)
    expect(tx.movements).toHaveLength(0)
  })

  it('blocks a deduction that would go negative with a Serbian message', async () => {
    const tx = createTx()
    await expect(
      syncInvoiceStock(tx, {
        profileId: 'prof',
        invoiceId: 'inv-1',
        invoiceNumber: '04/2026',
        status: 'PAID',
        items: [{ productId: 'p1', quantity: 8 }],
      })
    ).rejects.toMatchObject({
      name: 'InvoiceClientError',
      status: 400,
      message: insufficientStockMessage('Sok', 8, 7),
    })
    expect(tx.products.get('p1')?.quantity).toBe(7)
    expect(tx.movements).toHaveLength(0)
    expect(insufficientStockMessage('Sok', 8, 7)).toContain('Nema dovoljno na stanju')
  })

  it('does not deduct stock for a draft invoice', async () => {
    const tx = createTx()
    await syncInvoiceStock(tx, {
      profileId: 'prof',
      invoiceId: 'inv-1',
      invoiceNumber: '04/2026',
      status: 'DRAFT',
      items: [{ productId: 'p1', quantity: 3 }],
    })
    expect(tx.products.get('p1')?.quantity).toBe(7)
    expect(tx.movements).toHaveLength(0)
  })
})

describe('InvoiceClientError shape for stock', () => {
  it('is the same client error family as other invoice validation', () => {
    const error = new InvoiceClientError(insufficientStockMessage('Sok', 3, 1), 400)
    expect(error).toBeInstanceOf(InvoiceClientError)
    expect(error.status).toBe(400)
  })
})

describe('MovementType used for ledger writes', () => {
  it('keeps IN and OUT as the only warehouse directions', () => {
    expect(MovementType.IN).toBe('IN')
    expect(MovementType.OUT).toBe('OUT')
    expect(StockMovementSource.INTAKE).toBe('INTAKE')
    expect(StockMovementSource.INVOICE).toBe('INVOICE')
  })
})
