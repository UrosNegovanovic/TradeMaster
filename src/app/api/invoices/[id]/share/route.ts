import { randomBytes } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invoiceSharePath, isShareableInvoiceStatus } from '@/lib/public-invoice'

export const dynamic = 'force-dynamic'
type Context = { params: { id: string } }
const headers = { 'Cache-Control': 'private, no-store' }

async function ownedInvoice(id: string) {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }) }
  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
  if (!profile) return { error: NextResponse.json({ error: 'Not found' }, { status: 404, headers }) }
  const invoice = await prisma.invoice.findFirst({
    where: { id, profileId: profile.id },
    select: { id: true, status: true, shareToken: true, shareEnabled: true },
  })
  if (!invoice) return { error: NextResponse.json({ error: 'Not found' }, { status: 404, headers }) }
  return { invoice }
}

export async function GET(_request: NextRequest, { params }: Context) {
  const result = await ownedInvoice(params.id)
  if (result.error) return result.error
  const invoice = result.invoice!
  const active = invoice.shareEnabled && invoice.shareToken && isShareableInvoiceStatus(invoice.status)
  return NextResponse.json({ url: active ? invoiceSharePath(invoice.shareToken!) : null }, { headers })
}

// Every deliberate enable/renew action issues a fresh link and invalidates the old one.
export async function POST(_request: NextRequest, { params }: Context) {
  const result = await ownedInvoice(params.id)
  if (result.error) return result.error
  if (!isShareableInvoiceStatus(result.invoice!.status)) {
    return NextResponse.json({ error: 'Nacrt fakture se ne može podeliti. Prvo izdajte fakturu.' }, { status: 409, headers })
  }
  const token = randomBytes(32).toString('hex')
  await prisma.invoice.update({ where: { id: result.invoice!.id }, data: { shareToken: token, shareEnabled: true } })
  return NextResponse.json({ url: invoiceSharePath(token) }, { headers })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const result = await ownedInvoice(params.id)
  if (result.error) return result.error
  await prisma.invoice.update({ where: { id: result.invoice!.id }, data: { shareToken: null, shareEnabled: false } })
  return NextResponse.json({ url: null }, { headers })
}
