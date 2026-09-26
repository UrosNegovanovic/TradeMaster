import { randomBytes } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
type Context = { params: { id: string } }
const headers = { 'Cache-Control': 'private, no-store' }

async function ownedCatalog(id: string) {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }) }
  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
  if (!profile) return { error: NextResponse.json({ error: 'Not found' }, { status: 404, headers }) }
  const catalog = await prisma.catalog.findFirst({ where: { id, profileId: profile.id } })
  if (!catalog) return { error: NextResponse.json({ error: 'Not found' }, { status: 404, headers }) }
  return { catalog }
}

export async function GET(_request: NextRequest, { params }: Context) {
  const result = await ownedCatalog(params.id)
  if (result.error) return result.error
  const catalog = result.catalog!
  return NextResponse.json({ url: catalog.shareEnabled && catalog.shareToken ? `/shared/catalog/${catalog.shareToken}` : null }, { headers })
}

// Every deliberate enable/renew action issues a fresh link and invalidates the old one.
export async function POST(_request: NextRequest, { params }: Context) {
  const result = await ownedCatalog(params.id)
  if (result.error) return result.error
  const token = randomBytes(32).toString('hex')
  await prisma.catalog.update({ where: { id: result.catalog!.id }, data: { shareToken: token, shareEnabled: true } })
  return NextResponse.json({ url: `/shared/catalog/${token}` }, { headers })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const result = await ownedCatalog(params.id)
  if (result.error) return result.error
  await prisma.catalog.update({ where: { id: result.catalog!.id }, data: { shareToken: null, shareEnabled: false } })
  return NextResponse.json({ url: null }, { headers })
}
