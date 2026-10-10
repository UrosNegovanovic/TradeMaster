import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subscriptionDocumentsFor } from '@/lib/subscription-documents'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

/**
 * The signed-in company's TradeMaster subscription predračuni (platform billing, issued by T&G Nest), for
 * Podešavanja → Pristup i uplata. Read-only. These documents belong to the issuer's account, so they never
 * appear in the company's own Fakture, Finansije or accountant export.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers })
  return NextResponse.json(await subscriptionDocumentsFor(prisma, profile.id), { headers })
}
