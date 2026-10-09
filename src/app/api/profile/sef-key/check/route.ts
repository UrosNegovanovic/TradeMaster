import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit'
import { loadSefApiKey } from '@/lib/sef-server'
import { getEfakturaVersion, sefConfig } from '@/lib/sef-client'
import { sefErrorView } from '@/lib/sef-errors'
import { operator } from '@/lib/operator'
import { sefSendingAllowed } from '@/lib/sef-access'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

/** "Proveri vezu": one authenticated read on SEF with the saved key (ROADMAP A3). */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, rateLimits.sefKey)
  if (limited) return limited
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers })

  const config = sefConfig()
  const key = sefSendingAllowed(profile.id) ? await loadSefApiKey(prisma, profile.id) : null
  if (!config || !key?.ok) {
    return NextResponse.json({ ok: false, message: 'API ključ nije unet ili slanje u SEF nije dostupno.' }, { status: 409, headers })
  }
  const result = await getEfakturaVersion(config, key.apiKey)
  if (result.ok) return NextResponse.json({ ok: true, message: 'Veza sa SEF-om radi.' }, { headers })
  const error = sefErrorView(result, { invoiceId: '', supportEmail: operator.email })
  return NextResponse.json({ ok: false, message: error.message }, { headers })
}
