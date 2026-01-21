import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Fetch a single invoice by ID
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

    // Get user's profile
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

    // Fetch invoice with items
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
      include: {
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
            id: 'asc',
          },
        },
        profile: true,
      },
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

// PUT: Full invoice update (including items)
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
    const body = await request.json()

    // ✅ Validate required fields
    if (!body.invoiceNumber || !body.dueDate || !body.clientName) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceNumber, dueDate, or clientName' },
        { status: 400 }
      )
    }

    // ✅ Validate items array
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Invoice must have at least one item' },
        { status: 400 }
      )
    }

    // Check if invoice exists and belongs to user
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

    // ✅ Calculate total amount from items (server-side validation)
    const totalAmount = body.items.reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const discount = Number(item.discount) || 0
      const subtotal = quantity * unitPrice
      const discountedTotal = subtotal * (1 - discount / 100)
      return sum + discountedTotal
    }, 0)

    // ✅ Update invoice and replace all items in a transaction
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Step 1: Delete all existing items for this invoice
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      // Step 2: Update invoice with new data and create new items
      return await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: body.invoiceNumber,
          dueDate: new Date(body.dueDate),
          clientName: body.clientName,
          clientAddress: body.clientAddress || null,
          status: body.status || 'DRAFT',
          totalAmount,
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId || null,
              productName: item.productName,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount) || 0,
              total: Number(item.total),
            })),
          },
        },
        include: {
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
              id: 'asc',
            },
          },
          profile: true,
        },
      })
    })

    return NextResponse.json(updatedInvoice)
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    
    // ✅ Provide more specific error messages
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Invoice number already exists' },
        { status: 400 }
      )
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice. Please check your data and try again.' },
      { status: 500 }
    )
  }
}

// PATCH: Update invoice status
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

    // Get user's profile
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
    const body = await request.json()

    // Check if invoice exists and belongs to user
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

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status as 'DRAFT' | 'PAID' | 'UNPAID' }),
        ...(body.invoiceNumber && { invoiceNumber: body.invoiceNumber }),
        ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
        ...(body.clientName && { clientName: body.clientName }),
        ...(body.clientAddress !== undefined && { clientAddress: body.clientAddress }),
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
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete an invoice
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

    // Get user's profile
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

    // Check if invoice exists and belongs to user
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

    // Delete invoice (items will be deleted via cascade)
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
