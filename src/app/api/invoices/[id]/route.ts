import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  InvoiceClientError,
  assertOwnedProducts,
  computeInvoiceAmounts,
  invoiceErrorResponse,
  parseInvoicePatchBody,
  parseInvoiceWriteBody,
  parseJsonBody,
} from '@/lib/invoice-service'

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

    return NextResponse.json(invoice)
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

    const { id } = await context.params
    const body = await parseJsonBody(request)
    const parsed = parseInvoiceWriteBody(body)
    const { items, totalAmount } = computeInvoiceAmounts(parsed.items)

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found or you do not have permission to edit it' },
        { status: 404 }
      )
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await assertOwnedProducts(profile.id, items, tx)

      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      return tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: parsed.invoiceNumber,
          dueDate: new Date(parsed.dueDate),
          clientName: parsed.clientName,
          clientAddress: parsed.clientAddress || null,
          totalAmount,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total,
            })),
          },
        },
        include: invoiceInclude,
      })
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

    const { id } = await context.params
    const body = await parseJsonBody(request)
    const parsed = parseInvoicePatchBody(body)

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(parsed.status && { status: parsed.status }),
        ...(parsed.invoiceNumber && { invoiceNumber: parsed.invoiceNumber }),
        ...(parsed.dueDate && { dueDate: new Date(parsed.dueDate) }),
        ...(parsed.clientName && { clientName: parsed.clientName }),
        ...(parsed.clientAddress !== undefined && { clientAddress: parsed.clientAddress }),
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

    const { id } = await context.params

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
