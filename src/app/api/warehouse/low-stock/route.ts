import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/warehouse/low-stock
 * Fetch products where quantity <= minStock
 */
export async function GET() {
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

    // Fetch products with low stock (quantity <= minStock)
    const lowStockProducts = await prisma.product.findMany({
      where: {
        profileId: profile.id,
        quantity: {
          lte: prisma.product.fields.minStock, // quantity <= minStock
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minStock: true,
        imageUrl: true,
      },
      orderBy: [
        {
          quantity: 'asc', // Most critical first (lowest quantity)
        },
        {
          name: 'asc',
        },
      ],
    })

    return NextResponse.json(lowStockProducts)
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock products' },
      { status: 500 }
    )
  }
}
