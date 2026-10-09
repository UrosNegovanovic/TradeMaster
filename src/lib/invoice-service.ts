import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import {
  DISCOUNT_MAX,
  DISCOUNT_MIN,
  MONEY_MAX,
  UNIT_PRICE_MIN,
  calculateItemTotal,
  calculateVatBreakdown,
  hasAllowedMoneyScale,
  isWithinMoneyRange,
  uniqueProductIds,
} from '@/lib/invoice-totals'
import {
  invoicePatchSchema,
  invoiceCreateSchema,
  invoiceWriteSchema,
  type InvoiceCreateWriteInput,
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

function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ZodError' &&
      'errors' in error &&
      Array.isArray((error as { errors: unknown }).errors))
  )
}

export function invoiceErrorResponse(error: unknown) {
  if (error instanceof InvoiceClientError) {
    return NextResponse.json(
      error.details ? { error: error.message, details: error.details } : { error: error.message },
      { status: error.status }
    )
  }

  if (isZodError(error)) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.errors.map((issue) => ({
          path: Array.isArray(issue.path) ? issue.path.join('.') : '',
          message: String(issue.message),
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

export function parseInvoiceCreateBody(body: unknown): InvoiceCreateWriteInput {
  return invoiceCreateSchema.parse(body)
}

export function parseInvoicePatchBody(body: unknown) {
  return invoicePatchSchema.parse(body)
}

export const PAID_INVOICE_LOCKED_MESSAGE =
  'Plaćena faktura se ne može menjati. Prvo je vratite među otvorene.'

export function assertInvoiceContentEditable(status: string) {
  if (status === 'PAID') {
    throw new InvoiceClientError(PAID_INVOICE_LOCKED_MESSAGE, 409)
  }
}

export type ComputedInvoiceItem = {
  productId: string | null
  free?: boolean
  productName: string
  quantity: number
  unitPrice: Decimal
  discount: Decimal
  vatRate: number
  total: Decimal
}

/**
 * Line totals are excluding PDV. When the company is not in the PDV system every line is stored
 * with vatRate 0 whatever the client sent, so the server decides, not the form.
 * `totalAmount` is the amount payable (osnovica + PDV); `subtotal` is the osnovica.
 */
export function computeInvoiceAmounts(
  items: InvoiceWriteInput['items'],
  vatEnabled = false
): {
  items: ComputedInvoiceItem[]
  subtotal: Decimal
  vatAmount: Decimal
  totalAmount: Decimal
} {
  const computedItems = items.map((item, index) => {
    const unitPrice = new Decimal(item.unitPrice)
    const discount = new Decimal(item.discount)

    if (!hasAllowedMoneyScale(unitPrice) || unitPrice.lte(0) || unitPrice.lt(UNIT_PRICE_MIN) || unitPrice.gt(MONEY_MAX)) {
      throw new InvoiceClientError('Validation error', 400, [
        {
          path: `items.${index}.unitPrice`,
          message: 'unitPrice is outside the supported range or precision',
        },
      ])
    }

    if (!hasAllowedMoneyScale(discount) || discount.lt(DISCOUNT_MIN) || discount.gt(DISCOUNT_MAX)) {
      throw new InvoiceClientError('Validation error', 400, [
        {
          path: `items.${index}.discount`,
          message: 'discount is outside the supported range or precision',
        },
      ])
    }

    const total = calculateItemTotal(item.quantity, unitPrice, discount)

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
      free: !item.productId && item.free === true,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice,
      discount,
      vatRate: vatEnabled ? item.vatRate : 0,
      total,
    }
  })

  const breakdown = calculateVatBreakdown(computedItems)
  const totalAmount = breakdown.total
  if (!isWithinMoneyRange(totalAmount)) {
    throw new InvoiceClientError('Validation error', 400, [
      {
        path: 'totalAmount',
        message: 'totalAmount is outside the supported range',
      },
    ])
  }

  return {
    items: computedItems,
    subtotal: breakdown.base,
    vatAmount: breakdown.vat,
    totalAmount,
  }
}

/**
 * unitCost snapshot for a written line.
 * - Product line: the product's purchase price today (null when it has none yet, so Finansije flags it).
 * - Line without a product that was already on the document (its product was deleted, or it is a free
 *   line): keeps the stored snapshot, matched by name. Historical costs are never invented.
 * - New free line (prevoz, usluga, ambalaža; ROADMAP A9.11): sells no goods from stock, cost of goods 0.
 * - Anything else stays null.
 */
export function lineUnitCost(
  item: { productId?: string | null; productName: string; free?: boolean },
  productCosts: Map<string, Decimal | null>,
  previousCosts: Map<string, Decimal | null> = new Map()
): Decimal | number | null {
  if (item.productId) return productCosts.get(item.productId) ?? null
  if (previousCosts.has(item.productName)) return previousCosts.get(item.productName) ?? null
  return item.free ? 0 : null
}

/** Stored costs of lines without a product, by name, for lineUnitCost when a document is rewritten. */
export function costsOfLinesWithoutProduct(
  items: Array<{ productId: string | null; productName: string; unitCost: Decimal | null }>
): Map<string, Decimal | null> {
  return new Map(items.filter((item) => !item.productId).map((item) => [item.productName, item.unitCost]))
}

export async function assertOwnedProducts(
  profileId: string,
  items: Array<{ productId?: string | null }>,
  db: Pick<typeof prisma, 'product'> = prisma
) {
  const productIds = uniqueProductIds(items)
  if (productIds.length === 0) {
    return new Map<string, Decimal | null>()
  }

  const owned = await db.product.findMany({
    where: {
      id: { in: productIds },
      profileId,
    },
    select: { id: true, costPrice: true },
  })

  if (owned.length !== productIds.length) {
    throw new InvoiceClientError(
      'One or more products not found or do not belong to you',
      400
    )
  }

  return new Map(
    owned.map((product) => [
      product.id,
      product.costPrice === null ? null : new Decimal(product.costPrice),
    ])
  )
}
