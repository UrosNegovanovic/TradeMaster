import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OwnerStatsView } from '@/components/owner/OwnerStatsView'
import { nonCustomerProfileIds } from '@/lib/owner-stats'
import { loadOwnerStats } from '@/lib/owner-stats-query'
import { requirePlatformOwner } from '@/lib/platform-owner'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Statistika',
}

export default async function OwnerStatsPage() {
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  const stats = await loadOwnerStats(prisma, { excludeProfileIds: nonCustomerProfileIds() })
  return <OwnerStatsView stats={stats} />
}
