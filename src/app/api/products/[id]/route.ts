import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { persistProductImage, scheduleProductImagePersist } from '@/lib/persist-product-image'
import { productSchema } from '@/lib/validations'

// PUT: Update a product
export async function PUT(
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

    // Check if product exists and belongs to this user
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (existingProduct.profileId !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = productSchema.parse(body)

    // If SKU is being changed, check if new SKU already exists for TODAY (Daily Batching logic)
    if (validatedData.sku !== existingProduct.sku) {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      const skuExists = await prisma.product.findFirst({
        where: {
          profileId: profile.id,
          sku: validatedData.sku,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      })

      if (skuExists) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists for today' },
          { status: 409 }
        )
      }
    }

    const imageUrl = await persistProductImage(
      validatedData.imageUrl === '' ? null : validatedData.imageUrl ?? null
    )

    // Update product
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        sku: validatedData.sku,
        price: validatedData.price,
        quantity: validatedData.quantity ?? 1,
        description: validatedData.description === '' ? null : validatedData.description ?? null,
        imageUrl,
        categoryId: validatedData.categoryId ?? null,
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

    scheduleProductImagePersist(
      (storedUrl) =>
        prisma.product.update({
          where: { id: params.id },
          data: { imageUrl: storedUrl },
        }),
      imageUrl
    )

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)

    // Handle validation errors
    if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a product
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

    // Check if product exists and belongs to this user
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (existingProduct.profileId !== profile.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete product
    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
