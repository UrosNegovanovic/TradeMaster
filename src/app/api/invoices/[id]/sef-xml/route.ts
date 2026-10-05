import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildSefInvoiceXml } from '@/lib/sef-ubl'
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
    if (invoice.documentType !== 'INVOICE') {
      return NextResponse.json(
        { error: 'Predračun se ne šalje u SEF. Pretvorite ga u fakturu.' },
        { status: 409, headers }
      )
    }
    if (invoice.status === 'DRAFT') {
      return NextResponse.json({ error: 'Nacrt se ne šalje u SEF. Prvo izdajte fakturu.' }, { status: 409, headers })
    }

    const buyer = invoice.clientPib
      ? await prisma.client.findFirst({
          where: { profileId: profile.id, pib: invoice.clientPib },
          orderBy: { updatedAt: 'desc' },
          select: { registrationNumber: true },
        })
      : null

    const result = buildSefInvoiceXml({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      vatEnabled: invoice.vatEnabled,
      seller: {
        name: profile.companyName,
        pib: profile.pib,
        registrationNumber: profile.registrationNumber,
        address: profile.address,
        email: profile.contactEmail,
        giroAccount: profile.giroAccount,
      },
      buyer: {
        name: invoice.clientName,
        pib: invoice.clientPib,
        registrationNumber: buyer?.registrationNumber ?? null,
        address: invoice.clientAddress,
      },
      items: invoice.items,
    })

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
