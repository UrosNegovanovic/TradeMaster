import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { persistProductImage, scheduleProductImagePersist } from '@/lib/persist-product-image'
import { productSchema } from '@/lib/validations'
import { productPutFields } from '@/lib/product-put'
import { accessExpiredResponse } from '@/lib/access-guard'

export const dynamic = 'force-dynamic'

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
    const expired = accessExpiredResponse(profile)
    if (expired) return expired

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

    // If SKU is being changed, reject when another product already uses it.
    if (validatedData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          profileId: profile.id,
          sku: validatedData.sku,
          NOT: { id: params.id },
        },
        select: { id: true },
      })

      if (skuExists) {
        return NextResponse.json(
          { error: 'Proizvod sa ovim SKU-om već postoji' },
          { status: 409 }
        )
      }
    }

    const imageUrl = await persistProductImage(
      validatedData.imageUrl === '' ? null : validatedData.imageUrl ?? null
    )

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...productPutFields(validatedData),
        imageUrl,
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
    const expired = accessExpiredResponse(profile)
    if (expired) return expired

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
