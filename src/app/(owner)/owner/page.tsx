import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePlatformOwner } from '@/lib/platform-owner'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Panel vlasnika',
}

export default async function OwnerHomePage() {
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  return (
    <>
      <h1 className="text-2xl font-bold">Panel vlasnika</h1>
      <p className="mt-3 text-muted-foreground">Statistika, nalozi i naplata stižu u narednim koracima.</p>
    </>
  )
}
