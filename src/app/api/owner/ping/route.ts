import { NextResponse } from 'next/server'
import { requirePlatformOwner } from '@/lib/platform-owner'

export const dynamic = 'force-dynamic'

// GET: proves the owner gate works end to end (ROADMAP O1). 404 for everyone but the platform owner.
export async function GET() {
  const owner = await requirePlatformOwner()
  if (!owner.ok) return owner.response
  return NextResponse.json({ ok: true })
}
