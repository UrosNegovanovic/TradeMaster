import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicCatalogSelect, toPublicCatalogBody } from '@/lib/public-catalog'
import { rateLimitedResponse, rateLimits } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' }

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const limited = rateLimitedResponse(request, rateLimits.sharedCatalog)
  if (limited) return limited

  if (!/^[a-f0-9]{64}$/.test(params.token)) {
    return NextResponse.json({ error: 'Catalog not found' }, { status: 404, headers })
  }
  const catalog = await prisma.catalog.findFirst({
    where: { shareToken: params.token, shareEnabled: true },
    // Explicit public contract: never return private stock/current prices or owner IDs.
    select: publicCatalogSelect,
  })
  if (!catalog) return NextResponse.json({ error: 'Catalog not found' }, { status: 404, headers })
  return NextResponse.json(toPublicCatalogBody(catalog), { headers })
}
