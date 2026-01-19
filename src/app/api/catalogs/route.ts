import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { catalogSchema } from '@/lib/validations'
import { ZodError } from 'zod'
import type { Prisma } from '@prisma/client'

// GET: Fetch all catalogs for the current user
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const catalogs = await prisma.catalog.findMany({
      where: { profileId: profile.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                imageUrl: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(catalogs)
  } catch (error) {
    console.error('Error fetching catalogs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new catalog
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = catalogSchema.parse(body)

    // Verify all products belong to this user
    const products = await prisma.product.findMany({
      where: {
        id: { in: validatedData.productIds },
        profileId: profile.id,
      },
    })

    if (products.length !== validatedData.productIds.length) {
      return NextResponse.json(
        { error: 'One or more products not found or do not belong to you' },
        { status: 400 }
      )
    }

    // Calculate discounted prices and create catalog with items
    const catalog = await prisma.$transaction(async (tx) => {
      // Create catalog
      const newCatalog = await (tx as typeof prisma).catalog.create({
        data: {
          name: validatedData.name,
          clientName: validatedData.clientName === '' ? null : validatedData.clientName ?? null,
          discount: validatedData.discount,
          notes: validatedData.notes === '' ? null : validatedData.notes ?? null,
          profileId: profile.id,
        },
      })

      // Create catalog items with calculated prices
      const catalogItems = await Promise.all(
        products.map(async (product: (typeof products)[0], index: number) => {
          const originalPrice = Number(product.price)
          const discountedPrice = originalPrice * (1 - validatedData.discount / 100)

          return (tx as typeof prisma).catalogItem.create({
            data: {
              catalogId: newCatalog.id,
              productId: product.id,
              originalPrice,
              discountedPrice,
              sortOrder: index,
            },
          })
        })
      )

      return {
        ...newCatalog,
        items: catalogItems,
      }
    })

    // Fetch the complete catalog with products
    const catalogWithProducts = await prisma.catalog.findUnique({
      where: { id: catalog.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                imageUrl: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    return NextResponse.json(catalogWithProducts)
  } catch (error) {
    console.error('Error creating catalog:', error)

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
