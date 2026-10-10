import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePlatformOwner } from '@/lib/platform-owner'
import { nonCustomerProfileIds } from '@/lib/owner-stats'
import { loadOwnerStats } from '@/lib/owner-stats-query'

export const dynamic = 'force-dynamic'

// GET: platform statistics for the owner panel (ROADMAP O2). Numbers only, read-only; 404 for everyone else.
export async function GET() {
  const owner = await requirePlatformOwner()
  if (!owner.ok) return owner.response

  try {
    const stats = await loadOwnerStats(prisma, { excludeProfileIds: nonCustomerProfileIds() })
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error loading owner stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
