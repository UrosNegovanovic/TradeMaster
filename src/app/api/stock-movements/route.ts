import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { MovementType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseStockMovementListParams } from '@/lib/stock-movement-query'
import { productCostWriteFields } from '@/lib/product-cost'
import {
  costPriceZeroReasonSchema,
  normalizePurchasePrice,
  optionalCostPriceSchema,
  refineZeroPurchasePriceReason,
} from '@/lib/validations'
import { z } from 'zod'
import { accessExpiredResponse } from '@/lib/access-guard'

export const dynamic = 'force-dynamic'

// Validation schema for stock movement creation
const stockMovementSchema = z
  .object({
    productId: z.string().min(1, 'Product ID is required'),
    type: z.nativeEnum(MovementType, { errorMap: () => ({ message: 'Type must be IN or OUT' }) }),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    reason: z.string().min(1, 'Reason is required').max(200, 'Reason is too long'),
    costPrice: optionalCostPriceSchema,
    costPriceZeroReason: costPriceZeroReasonSchema,
  })
  .superRefine(refineZeroPurchasePriceReason)
  .transform(normalizePurchasePrice)

/**
 * GET /api/stock-movements
 * Fetch stock movements for the authenticated user
 * Query params:
 *   - limit: number of movements to return (default: 50, max: 100)
 *   - all=1 or limit=all: return every movement for the profile
 *   - productId: filter by specific product
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const { take, productId } = parseStockMovementListParams(searchParams)

    // Build where clause
    const where: Prisma.StockMovementWhereInput = {
      profileId: profile.id,
    }

    if (productId) {
      where.productId = productId
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
      }),
      prisma.stockMovement.count({ where }),
    ])

    return NextResponse.json(movements, {
      headers: {
        'X-Total-Count': String(total),
      },
    })
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}


class InsufficientStockError extends Error {}

/**
 * POST /api/stock-movements
 * Create a new stock movement and update product quantity
 * Body: { productId, type, quantity, reason }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const expired = accessExpiredResponse(profile)
    if (expired) return expired

    // Parse and validate request body
    const body = await request.json()
    const validationResult = stockMovementSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { productId, type, quantity, reason, costPrice, costPriceZeroReason } = validationResult.data

    // Verify product belongs to user
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        profileId: true,
        quantity: true,
        name: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.profileId !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized access to product' }, { status: 403 })
    }

    // Check if OUT movement would result in negative quantity
    if (type === MovementType.OUT && product.quantity < quantity) {
      return NextResponse.json(
        {
          error: 'Insufficient stock',
          details: `Cannot remove ${quantity} items. Current stock: ${product.quantity}`,
        },
        { status: 400 }
      )
    }

    // Apply the change atomically: increment/decrement in SQL, and a stock-out only matches while
    // enough stock remains, so two concurrent requests can never overwrite each other's quantity.
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          profileId: profile.id,
          ...(type === MovementType.OUT ? { quantity: { gte: quantity } } : {}),
        },
        data: {
          quantity: type === MovementType.IN ? { increment: quantity } : { decrement: quantity },
          ...(type === MovementType.IN && costPrice !== undefined && costPrice !== null
            ? productCostWriteFields({ costPrice, costPriceZeroReason })
            : {}),
        },
      })
      if (updated.count === 0) {
        throw new InsufficientStockError()
      }

      return tx.stockMovement.create({
        data: {
          type,
          quantity,
          reason,
          profileId: profile.id,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: 'Insufficient stock', details: 'Stock changed in the meantime; not enough items left.' },
        { status: 400 }
      )
    }
    console.error('Error creating stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}
