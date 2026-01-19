import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Fetch all invoices for the current user
export async function GET() {
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

    // Fetch all invoices for this profile
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new invoice
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      invoiceNumber,
      dueDate,
      clientName,
      clientAddress,
      status = 'DRAFT',
      items,
    } = body

    // Validate required fields
    if (!invoiceNumber || !dueDate || !clientName || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate total amount from items (with discount)
    const totalAmount = items.reduce((sum: number, item: any) => {
      const itemTotal = Number(item.quantity) * Number(item.unitPrice)
      const discount = Number(item.discount || 0)
      const itemTotalWithDiscount = itemTotal * (1 - discount / 100)
      return sum + itemTotalWithDiscount
    }, 0)

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          dueDate: new Date(dueDate),
          clientName,
          clientAddress: clientAddress || null,
          status: status as 'DRAFT' | 'PAID' | 'UNPAID',
          totalAmount,
          profileId: profile.id,
        },
      })

      // Create invoice items
      const invoiceItems = await Promise.all(
        items.map((item: any) => {
          const itemSubtotal = Number(item.quantity) * Number(item.unitPrice)
          const discount = Number(item.discount || 0)
          const itemTotal = itemSubtotal * (1 - discount / 100)
          
          return tx.invoiceItem.create({
            data: {
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discount: discount,
              total: itemTotal,
              productName: item.productName || 'Unknown Product',
              invoiceId: newInvoice.id,
              productId: item.productId || null,
            },
          })
        })
      )

      return {
        ...newInvoice,
        items: invoiceItems,
      }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
