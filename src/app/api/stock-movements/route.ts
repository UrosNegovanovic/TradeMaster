import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { MovementType } from '@prisma/client'

// Validation schema for stock movement creation
const stockMovementSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  type: z.nativeEnum(MovementType, { errorMap: () => ({ message: 'Type must be IN or OUT' }) }),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  reason: z.string().min(1, 'Reason is required').max(200, 'Reason is too long'),
})

/**
 * GET /api/stock-movements
 * Fetch stock movements for the authenticated user
 * Query params:
 *   - limit: number of movements to return (default: 50, max: 100)
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const productId = searchParams.get('productId')

    // Build where clause
    const where: any = {
      profileId: profile.id,
    }

    if (productId) {
      where.productId = productId
    }

    // Fetch stock movements
    const movements = await prisma.stockMovement.findMany({
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
      take: limit,
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}

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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = stockMovementSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { productId, type, quantity, reason } = validationResult.data

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

    // Calculate new quantity
    const newQuantity = type === MovementType.IN 
      ? product.quantity + quantity 
      : product.quantity - quantity

    // Create stock movement and update product quantity in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create stock movement
      const movement = await tx.stockMovement.create({
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

      // Update product quantity
      await tx.product.update({
        where: { id: productId },
        data: { quantity: newQuantity },
      })

      return movement
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}
