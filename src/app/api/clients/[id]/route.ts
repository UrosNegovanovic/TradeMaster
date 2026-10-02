import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientWriteSchema } from '@/lib/validations'
import { accessExpiredResponse } from '@/lib/access-guard'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

async function requireOwnedClient(id: string) {
  const { userId } = await auth()
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
  if (!profile) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) }
  }
  const expired = accessExpiredResponse(profile)
  if (expired) return { error: expired }

  // Scoping by profileId makes another tenant's client indistinguishable from a missing one.
  const client = await prisma.client.findFirst({ where: { id, profileId: profile.id } })
  if (!client) {
    return { error: NextResponse.json({ error: 'Client not found' }, { status: 404 }) }
  }

  return { client }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const owned = await requireOwnedClient((await params).id)
    if (owned.error) return owned.error

    const body = await request.json().catch(() => null)
    const parsed = clientWriteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const updated = await prisma.client.update({
      where: { id: owned.client.id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const owned = await requireOwnedClient((await params).id)
    if (owned.error) return owned.error

    // Invoices hold their own snapshot, so deleting a client never changes history.
    await prisma.client.delete({ where: { id: owned.client.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
