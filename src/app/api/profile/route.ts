import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { profileSchema } from '@/lib/validations'

// GET: Fetch profile for current user, create if doesn't exist
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Try to find existing profile
    let profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    // If profile doesn't exist, create a new one
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          clerkUserId: userId,
        },
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update profile details
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = profileSchema.parse(body)

    // Convert empty strings to null
    const updateData = {
      companyName: validatedData.companyName === '' ? null : validatedData.companyName ?? null,
      contactEmail: validatedData.contactEmail === '' ? null : validatedData.contactEmail ?? null,
      contactPhone: validatedData.contactPhone === '' ? null : validatedData.contactPhone ?? null,
      address: validatedData.address === '' ? null : validatedData.address ?? null,
      pib: validatedData.pib === '' ? null : validatedData.pib ?? null,
      logoUrl: validatedData.logoUrl === '' ? null : validatedData.logoUrl ?? null,
    }

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { clerkUserId: userId },
      update: updateData,
      create: {
        clerkUserId: userId,
        ...updateData,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
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
