import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleProductImagePersist } from '@/lib/persist-product-image'
import { productSchema } from '@/lib/validations'
import { IntakeConflictError, saveProductIntake } from '@/lib/product-intake'

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

    const key = request.headers.get('Idempotency-Key')
    if (key !== null && !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
      return NextResponse.json({ error: 'Invalid idempotency key' }, { status: 400 })
    }
    const result = await saveProductIntake(profile.id, validatedData, key)
    if (result.image) {
      const image = result.image
      scheduleProductImagePersist(
        (storedUrl) => prisma.product.update({ where: { id: image.id }, data: { imageUrl: storedUrl } }),
        image.url
      )
    }
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    if (error instanceof IntakeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
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
