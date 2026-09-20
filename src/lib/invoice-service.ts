import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import {
  calculateItemTotal,
  isWithinMoneyRange,
  sumRoundedItemTotals,
  uniqueProductIds,
} from '@/lib/invoice-totals'
import {
  invoicePatchSchema,
  invoiceWriteSchema,
  type InvoiceWriteInput,
} from '@/lib/validations'

export class InvoiceClientError extends Error {
  status: number
  details?: Array<{ path: string; message: string }>

  constructor(
    message: string,
    status = 400,
    details?: Array<{ path: string; message: string }>
  ) {
    super(message)
    this.name = 'InvoiceClientError'
    this.status = status
    this.details = details
  }
}

export function invoiceErrorResponse(error: unknown) {
  if (error instanceof InvoiceClientError) {
    return NextResponse.json(
      error.details ? { error: error.message, details: error.details } : { error: error.message },
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.errors.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new InvoiceClientError('Invalid JSON', 400)
  }
}

export function parseInvoiceWriteBody(body: unknown): InvoiceWriteInput {
  return invoiceWriteSchema.parse(body)
}

export function parseInvoicePatchBody(body: unknown) {
  return invoicePatchSchema.parse(body)
}

export type ComputedInvoiceItem = {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: Decimal
  discount: Decimal
  total: Decimal
}

export function computeInvoiceAmounts(items: InvoiceWriteInput['items']): {
  items: ComputedInvoiceItem[]
  totalAmount: Decimal
} {
  const computedItems = items.map((item, index) => {
    const total = calculateItemTotal(
      item.quantity,
      new Decimal(item.unitPrice),
      new Decimal(item.discount)
    )

    if (!isWithinMoneyRange(total)) {
      throw new InvoiceClientError('Validation error', 400, [
        {
          path: `items.${index}.total`,
          message: 'item total is outside the supported range',
        },
      ])
    }

    return {
      productId: item.productId ?? null,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: new Decimal(item.unitPrice),
      discount: new Decimal(item.discount),
      total,
    }
  })

  const totalAmount = sumRoundedItemTotals(computedItems.map((item) => item.total))
  if (!isWithinMoneyRange(totalAmount)) {
    throw new InvoiceClientError('Validation error', 400, [
      {
        path: 'totalAmount',
        message: 'totalAmount is outside the supported range',
      },
    ])
  }

  return { items: computedItems, totalAmount }
}

export async function assertOwnedProducts(
  profileId: string,
  items: Array<{ productId?: string | null }>,
  db: Pick<typeof prisma, 'product'> = prisma
) {
  const productIds = uniqueProductIds(items)
  if (productIds.length === 0) {
    return
  }

  const owned = await db.product.findMany({
    where: {
      id: { in: productIds },
      profileId,
    },
    select: { id: true },
  })

  if (owned.length !== productIds.length) {
    throw new InvoiceClientError(
      'One or more products not found or do not belong to you',
      400
    )
  }
}
