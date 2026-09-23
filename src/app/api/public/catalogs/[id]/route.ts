import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toPublicCatalog } from '@/lib/public-catalog'

export const dynamic = 'force-dynamic'

const publicCatalogInclude = {
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
    include: {
      product: {
        select: {
          name: true,
          sku: true,
          imageUrl: true,
          description: true,
        },
      },
    },
    orderBy: {
      sortOrder: 'asc' as const,
    },
  },
}

/** Unlisted share: knowing the catalog id is the access secret. GET only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const catalog = await prisma.catalog.findUnique({
      where: { id: params.id },
      include: publicCatalogInclude,
    })

    if (!catalog) {
      return NextResponse.json({ error: 'Catalog not found' }, { status: 404 })
    }

    return NextResponse.json(toPublicCatalog(catalog))
  } catch (error) {
    console.error('Error fetching public catalog:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
