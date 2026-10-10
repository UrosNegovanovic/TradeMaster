import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OwnerShell } from '@/components/owner/OwnerShell'
import { requirePlatformOwner } from '@/lib/platform-owner'

export const dynamic = 'force-dynamic'

// Platform owner panel (ROADMAP O1): its own shell and menu, no tenant navigation, never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  // Checked here so the shell never renders for anyone else; each page checks again for itself.
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  return <OwnerShell>{children}</OwnerShell>
}
