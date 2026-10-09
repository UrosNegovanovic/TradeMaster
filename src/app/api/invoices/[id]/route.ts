import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  InvoiceClientError,
  assertInvoiceContentEditable,
  assertOwnedProducts,
  computeInvoiceAmounts,
  invoiceErrorResponse,
  parseInvoicePatchBody,
  parseInvoiceWriteBody,
  parseJsonBody,
} from '@/lib/invoice-service'
import { nextPaidAt } from '@/lib/invoice-finance'
import { syncInvoiceStock } from '@/lib/invoice-stock'
import { accessExpiredResponse } from '@/lib/access-guard'
import { PROFORMA_PAID_MESSAGE, stockStatusFor } from '@/lib/document-type'
import { SEF_LOCKED_MESSAGE, isLockedBySef } from '@/lib/sef-status'
import { PAID_DELETE_MESSAGE, isPaidInvoiceStatus } from '@/lib/invoice-status'
import { buyerRegistrationNumber } from '@/lib/sef-invoice-xml'

export const dynamic = 'force-dynamic'

const invoiceInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
        },
      },
    },
    orderBy: {
      id: 'asc' as const,
    },
  },
  profile: true,
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
      include: invoiceInclude,
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Printed on the owner's PDF (ROADMAP A9.9); same Kupci lookup as the SEF XML.
    const buyerMb = await buyerRegistrationNumber(prisma, profile.id, invoice.clientPib)
    return NextResponse.json({ ...invoice, buyerRegistrationNumber: buyerMb })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params
    const body = await parseJsonBody(request)
    const parsed = parseInvoiceWriteBody(body)
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{
          id: string
          status: string
          vatEnabled: boolean
          documentType: string
          convertedInvoiceId: string | null
          sefStatus?: string | null
        }>
      >`
        SELECT id, status, "vatEnabled", "documentType"::text AS "documentType", "convertedInvoiceId", "sefStatus"
        FROM invoices WHERE id = ${id} AND "profileId" = ${profile.id} FOR UPDATE
      `

      if (locked.length === 0) {
        throw new InvoiceClientError(
          'Invoice not found or you do not have permission to edit it',
          404
        )
      }

      assertInvoiceContentEditable(locked[0].status)
      if (isLockedBySef(locked[0].sefStatus)) {
        throw new InvoiceClientError(SEF_LOCKED_MESSAGE, 409)
      }
      if (locked[0].convertedInvoiceId) {
        throw new InvoiceClientError('Predračun je već pretvoren u fakturu i ne menja se.', 409)
      }

      // A draft follows the company setting; an issued invoice keeps the setting it was issued with.
      const vatEnabled =
        locked[0].status === 'DRAFT' ? profile.inVatSystem : locked[0].vatEnabled
      const { items, vatAmount, totalAmount } = computeInvoiceAmounts(parsed.items, vatEnabled)

      const productCosts = await assertOwnedProducts(profile.id, items, tx)

      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: parsed.invoiceNumber,
          dueDate: new Date(parsed.dueDate),
          clientName: parsed.clientName,
          clientAddress: parsed.clientAddress || null,
          clientPib: parsed.clientPib,
          totalAmount,
          vatEnabled,
          vatAmount,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.productId ? productCosts.get(item.productId) ?? null : null,
              discount: item.discount,
              vatRate: item.vatRate,
              total: item.total,
            })),
          },
        },
        include: invoiceInclude,
      })

      await syncInvoiceStock(tx, {
        profileId: profile.id,
        invoiceId: id,
        invoiceNumber: parsed.invoiceNumber,
        status: stockStatusFor(locked[0].documentType, locked[0].status),
        items,
      })

      return updated
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    if (error instanceof InvoiceClientError || (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError')) {
      return invoiceErrorResponse(error)
    }

    console.error('Error updating invoice:', error)
    return invoiceErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params
    const body = await parseJsonBody(request)
    const parsed = parseInvoicePatchBody(body)

    const hasContentChange =
      parsed.invoiceNumber !== undefined ||
      parsed.dueDate !== undefined ||
      parsed.clientName !== undefined ||
      parsed.clientAddress !== undefined ||
      parsed.clientPib !== undefined

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string; status: string; invoiceNumber: string; paidAt: Date | null; documentType: string; sefStatus?: string | null }>
      >`
        SELECT id, status, "invoiceNumber", "paidAt", "documentType"::text AS "documentType", "sefStatus"
        FROM invoices
        WHERE id = ${id} AND "profileId" = ${profile.id}
        FOR UPDATE
      `

      if (locked.length === 0) {
        throw new InvoiceClientError('Invoice not found', 404)
      }

      if (hasContentChange) {
        assertInvoiceContentEditable(locked[0].status)
      }

      // Sent to SEF: content and "back to draft" are locked; marking it paid stays allowed.
      if (isLockedBySef(locked[0].sefStatus) && (hasContentChange || parsed.status === 'DRAFT')) {
        throw new InvoiceClientError(SEF_LOCKED_MESSAGE, 409)
      }

      if (locked[0].documentType === 'PROFORMA' && parsed.status === 'PAID') {
        throw new InvoiceClientError(PROFORMA_PAID_MESSAGE, 409)
      }

      const paidAt =
        parsed.status !== undefined
          ? nextPaidAt(locked[0].status, locked[0].paidAt, parsed.status)
          : undefined

      // A draft can sit while purchase prices change. Refresh the snapshots at issuance,
      // then keep them stable for the lifetime of the issued invoice.
      if (locked[0].status === 'DRAFT' && parsed.status && parsed.status !== 'DRAFT') {
        await tx.$executeRaw`
          UPDATE invoice_items AS item
          SET "unitCost" = product."costPrice"
          FROM products AS product
          WHERE item."invoiceId" = ${id}
            AND item."productId" = product.id
            AND product."profileId" = ${profile.id}
        `
      }

      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          ...(parsed.status && { status: parsed.status }),
          ...(paidAt !== undefined ? { paidAt } : {}),
          ...(parsed.invoiceNumber && { invoiceNumber: parsed.invoiceNumber }),
          ...(parsed.dueDate && { dueDate: new Date(parsed.dueDate) }),
          ...(parsed.clientName && { clientName: parsed.clientName }),
          ...(parsed.clientAddress !== undefined && { clientAddress: parsed.clientAddress }),
          ...(parsed.clientPib !== undefined && { clientPib: parsed.clientPib }),
        },
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
          profile: true,
        },
      })

      if (parsed.status !== undefined) {
        await syncInvoiceStock(tx, {
          profileId: profile.id,
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber,
          status: stockStatusFor(invoice.documentType, invoice.status),
          items: invoice.items,
        })
      }

      return invoice
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    if (error instanceof InvoiceClientError || (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError')) {
      return invoiceErrorResponse(error)
    }

    console.error('Error updating invoice:', error)
    return invoiceErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params

    await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findFirst({
        where: {
          id,
          profileId: profile.id,
        },
        include: { items: true },
      })

      if (!existingInvoice) {
        throw new InvoiceClientError('Invoice not found', 404)
      }
      if (isLockedBySef(existingInvoice.sefStatus)) {
        throw new InvoiceClientError(SEF_LOCKED_MESSAGE, 409)
      }
      if (isPaidInvoiceStatus(existingInvoice.status)) {
        throw new InvoiceClientError(PAID_DELETE_MESSAGE, 409)
      }

      await syncInvoiceStock(tx, {
        profileId: profile.id,
        invoiceId: id,
        invoiceNumber: existingInvoice.invoiceNumber,
        status: 'DRAFT',
        items: existingInvoice.items,
      })

      await tx.invoice.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof InvoiceClientError || (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError')) {
      return invoiceErrorResponse(error)
    }

    console.error('Error deleting invoice:', error)
    return invoiceErrorResponse(error)
  }
}
