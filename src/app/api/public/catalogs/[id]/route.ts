import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicCatalogSelect, toPublicCatalog } from '@/lib/public-catalog'
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit'
import { recordCatalogView } from '@/lib/catalog-view-counter'

export const dynamic = 'force-dynamic'

const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}

/** Guest JSON for old catalog-id links. Requires shareEnabled; token route is the revocable share. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = await enforceRateLimit(request, rateLimits.publicCatalog)
  if (limited) return limited

  try {
    const catalog = await prisma.catalog.findUnique({
      where: { id: params.id },
      select: { id: true, shareEnabled: true, ...publicCatalogSelect },
    })

    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404, headers })
    }

    if (!catalog.shareEnabled) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 410, headers })
    }

    await recordCatalogView({ id: catalog.id })
    const { shareEnabled: _shareEnabled, ...publicRecord } = catalog
    return NextResponse.json(toPublicCatalog(publicRecord), { headers })
  } catch (error) {
    console.error('Error fetching public catalog:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
