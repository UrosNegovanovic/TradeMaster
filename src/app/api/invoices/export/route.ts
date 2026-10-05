import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  MAX_EXPORT_ROWS,
  buildInvoiceExportRows,
  invoiceExportFilename,
  invoiceRowsToCsv,
  invoiceRowsToXlsx,
  parseExportRange,
} from '@/lib/invoice-export'

export const dynamic = 'force-dynamic'

/** Accountant export: issued invoices (not drafts) created in the chosen Belgrade day range. */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const params = request.nextUrl.searchParams
    const format = params.get('format') === 'xlsx' ? 'xlsx' : 'csv'
    const parsed = parseExportRange(params.get('from'), params.get('to'))
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { range } = parsed

    const invoices = await prisma.invoice.findMany({
      where: {
        profileId: profile.id,
        documentType: 'INVOICE',
        status: { not: 'DRAFT' },
        createdAt: { gte: range.from, lt: range.toExclusive },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_EXPORT_ROWS + 1,
    })

    if (invoices.length > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        { error: 'Previše faktura za jedan izvoz. Izaberite kraći period.' },
        { status: 400 }
      )
    }

    const rows = buildInvoiceExportRows(invoices)
    const filename = invoiceExportFilename(range, format)
    const body = format === 'xlsx' ? new Uint8Array(invoiceRowsToXlsx(rows)) : invoiceRowsToCsv(rows)

    return new NextResponse(body, {
      headers: {
        'Content-Type':
          format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error exporting invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
