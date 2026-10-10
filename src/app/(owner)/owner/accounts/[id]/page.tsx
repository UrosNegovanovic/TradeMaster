import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OwnerAccountDetailView } from '@/components/owner/OwnerAccountDetailView'
import { clerkPrimaryEmails } from '@/lib/clerk-emails'
import { ownerAccountTags } from '@/lib/owner-accounts'
import { loadOwnerAccountDetail } from '@/lib/owner-accounts-query'
import { requirePlatformOwner } from '@/lib/platform-owner'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nalog',
}

export default async function OwnerAccountPage({ params }: { params: { id: string } }) {
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  const detail = await loadOwnerAccountDetail(prisma, params.id, {
    lookupEmails: (ids) => clerkPrimaryEmails(ids),
    tags: ownerAccountTags(),
  })
  if (!detail) notFound()

  return <OwnerAccountDetailView detail={detail} />
}
