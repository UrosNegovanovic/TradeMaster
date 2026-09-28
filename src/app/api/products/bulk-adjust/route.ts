import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adjustStockToQuantity, SKU_MISSING_ERROR } from '@/lib/stock-adjust'
import { bulkAdjustItemSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

/**
 * POST /api/products/bulk-adjust
 * Set quantity for an existing product identified by SKU.
 * Difference is recorded as a MANUAL IN/OUT stock movement.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = bulkAdjustItemSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { sku, quantity } = validationResult.data
    const result = await adjustStockToQuantity(profile.id, sku, quantity)

    if (!result.ok) {
      const status = result.error === SKU_MISSING_ERROR ? 404 : 409
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error adjusting stock:', error)
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
  }
}
