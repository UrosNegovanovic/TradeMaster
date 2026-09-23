import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { catalogSchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET: Fetch a specific catalog with products
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const catalog = await prisma.catalog.findUnique({
      where: { id: params.id },
      include: {
        profile: {
          select: {
            id: true,
            companyName: true,
            contactEmail: true,
            contactPhone: true,
            address: true,
            logoUrl: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                imageUrl: true,
                description: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    if (!catalog) {
      return NextResponse.json(
        { error: 'Catalog not found' },
        { status: 404 }
      )
    }

    if (catalog.profileId !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json(catalog)
  } catch (error) {
    console.error('Error fetching catalog:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update catalog info and products
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if catalog exists and belongs to this user
    const existingCatalog = await prisma.catalog.findUnique({
      where: { id: params.id },
    })

    if (!existingCatalog) {
      return NextResponse.json(
        { error: 'Catalog not found' },
        { status: 404 }
      )
    }

    if (existingCatalog.profileId !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
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

    // Update catalog and items
    const updatedCatalog = await prisma.$transaction(async (tx) => {
      // Update catalog
      const catalog = await tx.catalog.update({
        where: { id: params.id },
        data: {
          name: validatedData.name,
          clientName: validatedData.clientName === '' ? null : validatedData.clientName ?? null,
          discount: validatedData.discount,
          notes: validatedData.notes === '' ? null : validatedData.notes ?? null,
        },
      })

      // Delete existing items
      await tx.catalogItem.deleteMany({
        where: { catalogId: params.id },
      })

      // Create new catalog items with calculated prices
      const catalogItems = await Promise.all(
        products.map(async (product, index) => {
          const originalPrice = Number(product.price)
          const discountedPrice = originalPrice * (1 - validatedData.discount / 100)

          return tx.catalogItem.create({
            data: {
              catalogId: params.id,
              productId: product.id,
              originalPrice,
              discountedPrice,
              sortOrder: index,
            },
          })
        })
      )

      return catalog
    })

    // Fetch the complete catalog with products
    const catalogWithProducts = await prisma.catalog.findUnique({
      where: { id: updatedCatalog.id },
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
    console.error('Error updating catalog:', error)

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

// DELETE: Delete a catalog
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if catalog exists and belongs to this user
    const existingCatalog = await prisma.catalog.findUnique({
      where: { id: params.id },
    })

    if (!existingCatalog) {
      return NextResponse.json(
        { error: 'Catalog not found' },
        { status: 404 }
      )
    }

    if (existingCatalog.profileId !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete catalog (cascade will delete items)
    await prisma.catalog.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Catalog deleted successfully' })
  } catch (error) {
    console.error('Error deleting catalog:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
