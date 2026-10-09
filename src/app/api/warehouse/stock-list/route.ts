import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildStockList, stockListFilename } from '@/lib/stock-list'
import { stockListToCsv, stockListToXlsx } from '@/lib/stock-list-export'

export const dynamic = 'force-dynamic'

/**
 * "Lager lista" for the accountant and stocktaking (ROADMAP A9.19): every SKU with stock, purchase and
 * sale value. Read-only, so it stays available after access expires, like the invoice export.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx'
    const products = await prisma.product.findMany({
      where: { profileId: profile.id },
      select: {
        sku: true,
        name: true,
        quantity: true,
        price: true,
        costPrice: true,
        createdAt: true,
        category: { select: { name: true } },
      },
    })

    const list = buildStockList(products)
    const body = format === 'xlsx' ? new Uint8Array(stockListToXlsx(list)) : stockListToCsv(list)
    return new NextResponse(body, {
      headers: {
        'Content-Type':
          format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${stockListFilename(format)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error exporting stock list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
