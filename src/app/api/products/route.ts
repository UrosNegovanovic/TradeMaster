import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validations'

// GET: Fetch all products for the current user
export async function GET() {
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

    // Fetch all products for this profile
    const products = await prisma.product.findMany({
      where: { profileId: profile.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new product OR update existing product's stock (Inventory Upsert)
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validate input
    const validatedData = productSchema.parse(body)

    // ✅ INVENTORY UPSERT LOGIC: Check if SKU already exists for this profile
    const existingProduct = await prisma.product.findUnique({
      where: {
        profileId_sku: {
          profileId: profile.id,
          sku: validatedData.sku,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (existingProduct) {
      // ✅ PRODUCT EXISTS: Update stock quantity instead of throwing error
      const quantityToAdd = validatedData.quantity ?? 1
      const newQuantity = existingProduct.quantity + quantityToAdd

      // Prepare update data
      const updateData: {
        quantity: number
        price?: number
        categoryId?: string | null
        updatedAt: Date
      } = {
        quantity: newQuantity,
        updatedAt: new Date(),
      }

      // Update price if user provided a new non-zero value
      if (validatedData.price > 0) {
        updateData.price = validatedData.price
      }

      // Update category if provided
      if (validatedData.categoryId !== undefined) {
        updateData.categoryId = validatedData.categoryId
      }

      // Update the existing product
      const updatedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json(
        {
          ...updatedProduct,
          action: 'updated' as const,
          quantityAdded: quantityToAdd,
          previousQuantity: existingProduct.quantity,
        },
        { status: 200 }
      )
    }

    // ✅ PRODUCT DOES NOT EXIST: Create new product
    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        sku: validatedData.sku,
        price: validatedData.price,
        quantity: validatedData.quantity ?? 1,
        description: validatedData.description === '' ? null : validatedData.description ?? null,
        imageUrl: validatedData.imageUrl === '' ? null : validatedData.imageUrl ?? null,
        categoryId: validatedData.categoryId ?? null,
        profileId: profile.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        ...product,
        action: 'created' as const,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating/updating product:', error)

    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }

    // Handle Prisma unique constraint error (fallback - shouldn't happen with new logic)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
