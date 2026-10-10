import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OwnerAccountsView } from '@/components/owner/OwnerAccountsView'
import { clerkPrimaryEmails } from '@/lib/clerk-emails'
import { countOwnerAccountFilters, ownerAccountTags, parseOwnerAccountFilter, selectOwnerAccounts } from '@/lib/owner-accounts'
import { loadOwnerAccounts } from '@/lib/owner-accounts-query'
import { requirePlatformOwner } from '@/lib/platform-owner'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nalozi',
}

/** The search box is free text from the URL: one value, trimmed and capped. */
function searchQuery(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? '').trim().slice(0, 100)
}

export default async function OwnerAccountsPage({
  searchParams,
}: {
  searchParams: { filter?: string | string[]; q?: string | string[] }
}) {
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  const filter = parseOwnerAccountFilter(searchParams.filter)
  const query = searchQuery(searchParams.q)
  const { accounts, emailsAvailable } = await loadOwnerAccounts(prisma, {
    lookupEmails: (ids) => clerkPrimaryEmails(ids),
    tags: ownerAccountTags(),
  })

  return (
    <OwnerAccountsView
      accounts={selectOwnerAccounts(accounts, { filter, query })}
      counts={countOwnerAccountFilters(accounts)}
      filter={filter}
      query={query}
      emailsAvailable={emailsAvailable}
    />
  )
}
