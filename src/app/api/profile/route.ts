import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { profilePutFields } from '@/lib/profile-put'
import { initialAccessExpiry } from '@/lib/access-period'
import { profileSchema } from '@/lib/validations'

// Force dynamic rendering (uses Clerk auth with headers)
export const dynamic = 'force-dynamic'

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
          accessExpiresAt: initialAccessExpiry(),
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
    const updateData = profilePutFields(validatedData, body)

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { clerkUserId: userId },
      update: updateData,
      create: {
        clerkUserId: userId,
        accessExpiresAt: initialAccessExpiry(),
        ...updateData,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
