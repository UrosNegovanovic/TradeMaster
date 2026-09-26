import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' }

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  if (!/^[a-f0-9]{64}$/.test(params.token)) {
    return NextResponse.json({ error: 'Catalog not found' }, { status: 404, headers })
  }
  const catalog = await prisma.catalog.findFirst({
    where: { shareToken: params.token, shareEnabled: true },
    // Explicit public contract: never return private stock/current prices or owner IDs.
    select: {
      name: true, clientName: true, notes: true, discount: true,
      profile: { select: { companyName: true, contactEmail: true, contactPhone: true, address: true, logoUrl: true } },
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, originalPrice: true, discountedPrice: true,
          product: { select: { name: true, sku: true, description: true, imageUrl: true } },
        },
      },
    },
  })
  if (!catalog) return NextResponse.json({ error: 'Catalog not found' }, { status: 404, headers })
  return NextResponse.json(catalog, { headers })
}
