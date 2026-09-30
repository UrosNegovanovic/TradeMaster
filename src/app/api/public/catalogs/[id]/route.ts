import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toPublicCatalog } from '@/lib/public-catalog'

export const dynamic = 'force-dynamic'

const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}

/** Guest JSON for old catalog-id links. Requires shareEnabled; token route is the revocable share. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const catalog = await prisma.catalog.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        clientName: true,
        discount: true,
        notes: true,
        shareEnabled: true,
        profile: {
          select: {
            companyName: true,
            contactEmail: true,
            contactPhone: true,
            address: true,
            logoUrl: true,
          },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            originalPrice: true,
            discountedPrice: true,
            sortOrder: true,
            product: {
              select: {
                name: true,
                sku: true,
                imageUrl: true,
                description: true,
              },
            },
          },
        },
      },
    })

    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404, headers })
    }

    if (!catalog.shareEnabled) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 410, headers })
    }

    const { shareEnabled: _shareEnabled, ...publicRecord } = catalog
    return NextResponse.json(toPublicCatalog(publicRecord), { headers })
  } catch (error) {
    console.error('Error fetching public catalog:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
