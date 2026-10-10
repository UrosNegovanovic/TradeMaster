import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  InvoiceClientError,
  assertOwnedProducts,
  lineUnitCost,
  computeInvoiceAmounts,
  invoiceErrorResponse,
  parseInvoiceCreateBody,
  parseJsonBody,
} from '@/lib/invoice-service'
import { OPEN_INVOICE_STATUS } from '@/lib/invoice-status'
import { nextPaidAt } from '@/lib/invoice-finance'
import { syncInvoiceStock } from '@/lib/invoice-stock'
import { reserveNextInvoiceNumber } from '@/lib/invoice-number'
import { accessExpiredResponse } from '@/lib/access-guard'
import { PROFORMA_PAID_MESSAGE, stockStatusFor } from '@/lib/document-type'
import { subscriptionInvoiceIds } from '@/lib/subscription-documents'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const invoices = await prisma.invoice.findMany({
      where: { profileId: profile.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        billingNotice: { select: { id: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // TradeMaster subscription documents (platform billing) are marked so the owner can filter them.
    const subscription = subscriptionInvoiceIds(invoices)
    return NextResponse.json(invoices.map(({ billingNotice: _notice, ...invoice }) => ({ ...invoice, subscription: subscription.has(invoice.id) })))
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    const expired = accessExpiredResponse(profile)
    if (expired) return expired

    if (!profile.pib || !/^\d{9}$/.test(profile.pib)) {
      return NextResponse.json(
        { error: 'Unesite važeći PIB firme od 9 cifara pre izdavanja fakture.' },
        { status: 400 }
      )
    }

    const body = await parseJsonBody(request)
    const parsed = parseInvoiceCreateBody(body)
    const vatEnabled = profile.inVatSystem
    const { items, vatAmount, totalAmount } = computeInvoiceAmounts(parsed.items, vatEnabled)
    const documentType = parsed.documentType ?? 'INVOICE'
    const status = parsed.status ?? OPEN_INVOICE_STATUS
    if (documentType === 'PROFORMA' && status === 'PAID') {
      throw new InvoiceClientError(PROFORMA_PAID_MESSAGE, 409)
    }
    const paidAt = nextPaidAt('UNPAID', null, status)

    const invoice = await prisma.$transaction(async (tx) => {
      const productCosts = await assertOwnedProducts(profile.id, items, tx)
      const invoiceNumber = await reserveNextInvoiceNumber(tx, profile.id, new Date(), documentType)

      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          dueDate: new Date(parsed.dueDate),
          clientName: parsed.clientName,
          clientAddress: parsed.clientAddress || null,
          note: parsed.note ?? null,
          clientPib: parsed.clientPib || null,
          status,
          paidAt: paidAt ?? null,
          totalAmount,
          vatEnabled,
          vatAmount,
          documentType,
          profileId: profile.id,
        },
      })

      const invoiceItems = await Promise.all(
        items.map((item) =>
          tx.invoiceItem.create({
            data: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: lineUnitCost(item, productCosts),
              discount: item.discount,
              vatRate: item.vatRate,
              total: item.total,
              productName: item.productName,
              invoiceId: newInvoice.id,
              productId: item.productId,
            },
          })
        )
      )

      await syncInvoiceStock(tx, {
        profileId: profile.id,
        invoiceId: newInvoice.id,
        invoiceNumber,
        status: stockStatusFor(documentType, status),
        items,
      })

      return {
        ...newInvoice,
        items: invoiceItems,
      }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof InvoiceClientError || (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError')) {
      return invoiceErrorResponse(error)
    }

    console.error('Error creating invoice:', error)
    return invoiceErrorResponse(error)
  }
}
