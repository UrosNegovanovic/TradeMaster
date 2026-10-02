import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitedResponse, rateLimits } from '@/lib/rate-limit'
import { SHAREABLE_INVOICE_STATUSES, isShareToken, publicInvoiceSelect } from '@/lib/public-invoice'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' }

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const limited = rateLimitedResponse(request, rateLimits.sharedInvoice)
  if (limited) return limited

  if (!isShareToken(params.token)) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers })
  }
  const invoice = await prisma.invoice.findFirst({
    // Drafts are never public, even if a link was issued before.
    where: { shareToken: params.token, shareEnabled: true, status: { in: [...SHAREABLE_INVOICE_STATUSES] } },
    select: publicInvoiceSelect,
  })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers })
  return NextResponse.json(invoice, { headers })
}
