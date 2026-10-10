import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  InvoiceClientError,
  assertOwnedProducts,
  costsOfLinesWithoutProduct,
  lineUnitCost,
  computeInvoiceAmounts,
  invoiceErrorResponse,
} from '@/lib/invoice-service'
import { OPEN_INVOICE_STATUS } from '@/lib/invoice-status'
import { syncInvoiceStock } from '@/lib/invoice-stock'
import { reserveNextInvoiceNumber } from '@/lib/invoice-number'
import { accessExpiredResponse } from '@/lib/access-guard'
import { convertedDueDate } from '@/lib/document-type'
import { invoiceItemWriteSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

/**
 * Turns a proforma (predračun) into an issued invoice: same buyer, lines and agreed prices,
 * a new invoice number, today's purchase costs, and stock leaves the warehouse now.
 * A proforma converts once; the invoice links back through `convertedInvoiceId`.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const expired = accessExpiredResponse(profile)
    if (expired) return expired

    if (!profile.pib || !/^\d{9}$/.test(profile.pib)) {
      return NextResponse.json(
        { error: 'Unesite važeći PIB firme od 9 cifara pre izdavanja fakture.' },
        { status: 400 }
      )
    }

    const { id } = await context.params

    const invoice = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string; documentType: string; convertedInvoiceId: string | null }>
      >`
        SELECT id, "documentType"::text AS "documentType", "convertedInvoiceId"
        FROM invoices WHERE id = ${id} AND "profileId" = ${profile.id} FOR UPDATE
      `
      if (locked.length === 0) {
        throw new InvoiceClientError('Predračun nije pronađen.', 404)
      }
      if (locked[0].documentType !== 'PROFORMA') {
        throw new InvoiceClientError('Samo predračun može da se pretvori u fakturu.', 409)
      }
      if (locked[0].convertedInvoiceId) {
        throw new InvoiceClientError('Ovaj predračun je već pretvoren u fakturu.', 409)
      }

      const proforma = await tx.invoice.findUniqueOrThrow({
        where: { id },
        include: { items: { orderBy: { id: 'asc' } } },
      })
      if (proforma.items.length === 0) {
        throw new InvoiceClientError('Predračun nema stavki.', 400)
      }

      // Re-validate the stored lines with the same schema a new invoice goes through.
      const lines = invoiceItemWriteSchema.array().parse(
        proforma.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          vatRate: Number(item.vatRate),
        }))
      )
      const { items, vatAmount, totalAmount } = computeInvoiceAmounts(lines, profile.inVatSystem)
      const productCosts = await assertOwnedProducts(profile.id, items, tx)
      // Free lines keep the predračun's snapshot (0 for a service), product lines take today's cost.
      const previousCosts = costsOfLinesWithoutProduct(proforma.items)
      const invoiceNumber = await reserveNextInvoiceNumber(tx, profile.id, new Date(), 'INVOICE')
      const status = OPEN_INVOICE_STATUS

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          documentType: 'INVOICE',
          dueDate: convertedDueDate(proforma),
          clientName: proforma.clientName,
          clientAddress: proforma.clientAddress,
          note: proforma.note,
          clientPib: proforma.clientPib,
          status,
          totalAmount,
          vatEnabled: profile.inVatSystem,
          vatAmount,
          profileId: profile.id,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: lineUnitCost(item, productCosts, previousCosts),
              discount: item.discount,
              vatRate: item.vatRate,
              total: item.total,
            })),
          },
        },
      })

      await syncInvoiceStock(tx, {
        profileId: profile.id,
        invoiceId: created.id,
        invoiceNumber,
        status,
        items,
      })

      await tx.invoice.update({ where: { id }, data: { convertedInvoiceId: created.id } })

      return created
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (!(error instanceof InvoiceClientError)) {
      console.error('Error converting proforma:', error)
    }
    return invoiceErrorResponse(error)
  }
}
