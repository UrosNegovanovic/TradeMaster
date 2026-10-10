'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accessNotice } from '@/lib/access-notice'
import { cn } from '@/lib/utils'

async function fetchProfile(): Promise<{ accessExpiresAt?: string | null; createdAt?: string | null }> {
  const response = await fetch('/api/profile')
  if (!response.ok) throw new Error('Failed to fetch profile')
  return response.json()
}

/**
 * Billing notice on every page (manual billing): amber in the last 7 days, red during the 2 grace days
 * after expiry (everything still works, pay by the date shown), red after that (read-only until paid).
 * The button leads to Podešavanja → Pristup, where the payment details are.
 */
export function AccessBanner() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
  const pathname = usePathname()
  // Podešavanja show the same notice in "Pristup i uplata", with the payment steps.
  if (!profile || pathname?.startsWith('/settings')) return null

  const notice = accessNotice(profile.accessExpiresAt, profile.createdAt)
  if (!notice) return null

  const red = notice.tone === 'danger'
  const Icon = notice.state === 'expired' ? Lock : red ? AlertTriangle : Clock

  return (
    <div
      role={red ? 'alert' : 'status'}
      className={cn(
        'border-b px-4 py-3 text-sm',
        red
          ? 'border-destructive/40 bg-destructive text-destructive-foreground'
          : 'border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100'
      )}
    >
      <div className="container mx-auto flex flex-col gap-3 px-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold">{notice.title}</p>
            <p className={red ? 'opacity-90' : 'text-muted-foreground'}>{notice.detail}</p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant={red ? 'secondary' : 'outline'}
          className="min-h-10 shrink-0 self-start sm:self-center"
        >
          <Link href="/settings#pristup">{notice.action}</Link>
        </Button>
      </div>
    </div>
  )
}
