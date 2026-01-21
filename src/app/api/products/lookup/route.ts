import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET: Lookup a product by SKU
 * Query params: ?sku=...
 * Returns: Product details if found (200 OK) or 404 if not found
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get SKU from query params
    const searchParams = request.nextUrl.searchParams
    const sku = searchParams.get('sku')

    if (!sku || sku.trim() === '') {
      return NextResponse.json(
        { error: 'SKU parameter is required' },
        { status: 400 }
      )
    }

    // ✅ Look up product by SKU (scoped to user's profile)
    // With daily batching, there may be multiple entries for the same SKU
    // We return the MOST RECENT entry for auto-fill purposes
    const product = await prisma.product.findFirst({
      where: {
        profileId: profile.id,
        sku: sku.trim(),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent entry first
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found', found: false },
        { status: 404 }
      )
    }

    // Return product details
    return NextResponse.json({
      found: true,
      product,
    })
  } catch (error) {
    console.error('Error looking up product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
