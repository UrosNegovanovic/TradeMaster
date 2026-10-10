import { notFound, redirect } from 'next/navigation'
import { requirePlatformOwner } from '@/lib/platform-owner'

export const dynamic = 'force-dynamic'

// The panel opens on Statistika; `/owner` itself has no content of its own.
export default async function OwnerHomePage() {
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  redirect('/owner/stats')
}
