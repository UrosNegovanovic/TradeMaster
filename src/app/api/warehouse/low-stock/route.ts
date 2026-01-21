import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // ✅ Fetch ALL products and aggregate by SKU (for daily batching)
    const allProducts = await prisma.product.findMany({
      where: {
        profileId: profile.id,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        minStock: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    })

    // ✅ Aggregate products by SKU (sum quantities from different days)
    const productMap = new Map<string, typeof allProducts[0] & { totalQuantity: number }>()

    allProducts.forEach((product) => {
      const existing = productMap.get(product.sku)
      
      if (existing) {
        // SKU already exists, sum the quantity
        existing.totalQuantity += product.quantity
        // Keep the most recent entry's details
        if (new Date(product.createdAt) > new Date(existing.createdAt)) {
          productMap.set(product.sku, {
            ...product,
            totalQuantity: existing.totalQuantity,
          })
        }
      } else {
        // First entry for this SKU
        productMap.set(product.sku, {
          ...product,
          totalQuantity: product.quantity,
        })
      }
    })

    // ✅ Filter for low stock (totalQuantity <= minStock)
    const lowStockProducts = Array.from(productMap.values())
      .filter((product) => product.totalQuantity <= product.minStock)
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: product.totalQuantity, // Use aggregated total
        minStock: product.minStock,
        imageUrl: product.imageUrl,
      }))
      .sort((a, b) => {
        // Sort by quantity (most critical first), then by name
        if (a.quantity !== b.quantity) {
          return a.quantity - b.quantity
        }
        return a.name.localeCompare(b.name)
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
