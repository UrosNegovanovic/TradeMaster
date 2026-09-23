import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchLowStockProducts } from '@/lib/low-stock'

// Force dynamic rendering (uses Clerk auth with headers)
export const dynamic = 'force-dynamic'

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

    return NextResponse.json(await fetchLowStockProducts(profile.id))
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock products' },
      { status: 500 }
    )
  }
}
