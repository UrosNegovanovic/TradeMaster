import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { requirePlatformOwner } from '@/lib/platform-owner'
import { AFTER_AUTH_PATH } from '@/lib/after-auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Panel vlasnika',
}

export default async function OwnerHomePage() {
  const owner = await requirePlatformOwner()
  if (!owner.ok) notFound()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Panel vlasnika</h1>
        <Button variant="outline" className="min-h-11" asChild>
          <Link href={AFTER_AUTH_PATH}>Moja firma</Link>
        </Button>
      </div>
      <p className="mt-4 text-muted-foreground">Statistika i nalozi stižu u narednim koracima.</p>
    </main>
  )
}
