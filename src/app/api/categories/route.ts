import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const categorySchema = z.object({
  name: z.string().min(1, 'Naziv je obavezan').max(100),
  description: z.string().optional().nullable(),
})

async function requireProfile(userId: string) {
  return prisma.profile.findUnique({
    where: { clerkUserId: userId },
  })
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await requireProfile(userId)
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const categories = await prisma.category.findMany({
      where: { profileId: profile.id },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await requireProfile(userId)
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validationResult = categorySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    const existingCategory = await prisma.category.findFirst({
      where: { profileId: profile.id, name },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Kategorija sa ovim nazivom već postoji' },
        { status: 409 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        profileId: profile.id,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kategorija sa ovim nazivom već postoji' },
        { status: 409 }
      )
    }

    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
