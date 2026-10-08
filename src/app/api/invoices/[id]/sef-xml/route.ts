import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildInvoiceSefXml, sefDocumentRefusal } from '@/lib/sef-invoice-xml'
import { sefXmlFileName } from '@/lib/document-type'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

/**
 * Downloads an issued invoice as SEF UBL XML for upload on the SEF portal. Read-only, so it stays
 * available to expired accounts like the other exports. The buyer's matični broj comes from the
 * saved buyer (Kupci) with the same PIB, because invoices store only the PIB.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    }

    const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers })
    }

    const { id } = await context.params
    const invoice = await prisma.invoice.findFirst({
      where: { id, profileId: profile.id },
      include: { items: { orderBy: { id: 'asc' } } },
    })
    if (!invoice) {
      return NextResponse.json({ error: 'Faktura nije pronađena.' }, { status: 404, headers })
    }
    const refusal = sefDocumentRefusal(invoice)
    if (refusal) {
      return NextResponse.json({ error: refusal }, { status: 409, headers })
    }

    const result = await buildInvoiceSefXml(prisma, profile, invoice)

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Za XML fakturu nedostaju podaci.', problems: result.problems },
        { status: 422, headers }
      )
    }

    return new NextResponse(result.xml, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${sefXmlFileName(invoice.invoiceNumber)}"`,
      },
    })
  } catch (error) {
    console.error('Error building SEF XML:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
