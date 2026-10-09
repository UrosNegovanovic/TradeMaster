import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { accessExpiredResponse } from '@/lib/access-guard'
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit'
import { deleteSefApiKey, hasSefApiKey, saveSefApiKey, sefEncryptionAvailable } from '@/lib/sef-server'
import { sefConfig, isSefDemo } from '@/lib/sef-client'
import { sefSendingAllowed } from '@/lib/sef-access'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

/** The key is never returned: only whether one is saved (ROADMAP A3). */
const sefKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(10, 'API ključ je prekratak.')
    .max(200, 'API ključ je predugačak.')
    .regex(/^[A-Za-z0-9-_.]+$/, 'API ključ sadrži nedozvoljene znakove. Kopirajte ga ponovo sa SEF portala.'),
})

async function loadProfile() {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }) }
  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
  if (!profile) return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404, headers }) }
  return { profile }
}

function stateBody(profileId: string, configured: boolean) {
  const config = sefConfig()
  return {
    available: sefEncryptionAvailable() && config !== null && sefSendingAllowed(profileId),
    configured,
    environment: config ? (isSefDemo(config) ? 'demo' : 'production') : null,
  }
}

export async function GET() {
  const loaded = await loadProfile()
  if (loaded.error) return loaded.error
  return NextResponse.json(stateBody(loaded.profile.id, await hasSefApiKey(prisma, loaded.profile.id)), { headers })
}

export async function PUT(request: NextRequest) {
  const limited = await enforceRateLimit(request, rateLimits.sefKey)
  if (limited) return limited
  const loaded = await loadProfile()
  if (loaded.error) return loaded.error
  const expired = accessExpiredResponse(loaded.profile)
  if (expired) return expired

  const parsed = sefKeySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Neispravan API ključ.' }, { status: 400, headers })
  }
  if (!stateBody(loaded.profile.id, false).available) {
    return NextResponse.json({ error: 'Slanje u SEF trenutno nije dostupno.' }, { status: 503, headers })
  }
  await saveSefApiKey(prisma, loaded.profile.id, parsed.data.apiKey)
  return NextResponse.json(stateBody(loaded.profile.id, true), { headers })
}

/** Removing the key is allowed even after access expires, like revoking a share link. */
export async function DELETE(request: NextRequest) {
  const limited = await enforceRateLimit(request, rateLimits.sefKey)
  if (limited) return limited
  const loaded = await loadProfile()
  if (loaded.error) return loaded.error
  await deleteSefApiKey(prisma, loaded.profile.id)
  return NextResponse.json(stateBody(loaded.profile.id, false), { headers })
}
