'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock } from 'lucide-react'
import { operator } from '@/lib/operator'
import { MONTHLY_PRICE } from '@/lib/landing-copy'
import { accessStatus, formatAccessDate, formatDaysLeft } from '@/lib/access-period'
import { cn } from '@/lib/utils'

async function fetchProfile(): Promise<{ accessExpiresAt?: string | null }> {
  const response = await fetch('/api/profile')
  if (!response.ok) throw new Error('Failed to fetch profile')
  return response.json()
}

/**
 * Manual billing notice: appears in the last 14 days of the access period and after it ended.
 * After expiry the account is read-only (the API refuses writes with 402) until the owner extends it.
 */
export function AccessBanner() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
  if (!profile) return null

  const status = accessStatus(profile.accessExpiresAt)
  if (status.state !== 'expiring' && status.state !== 'expired') return null

  const expired = status.state === 'expired'
  const Icon = expired ? AlertTriangle : Clock
  const date = status.untilYmd ? formatAccessDate(status.untilYmd) : ''

  return (
    <div
      role="status"
      className={cn(
        'border-b px-4 py-3 text-sm',
        expired
          ? 'border-destructive/30 bg-destructive/10 text-foreground'
          : 'border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100'
      )}
    >
      <div className="container mx-auto flex items-start gap-3 px-0">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', expired && 'text-destructive')} aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">
            {expired
              ? `Pristup je istekao ${date}. Aplikacija je u režimu samo za pregled.`
              : `Pristup ističe ${formatDaysLeft(status.daysLeft ?? 0)} (${date})`}
          </p>
          <p className="text-muted-foreground">
            {expired
              ? 'Podaci su vidljivi i mogu da se izvezu, ali ne mogu da se dodaju ni menjaju. '
              : 'Posle isteka aplikacija prelazi u režim samo za pregled. '}
            Za produženje ({MONTHLY_PRICE} mesečno, račun ručno) javite se na{' '}
            <a className="underline underline-offset-2" href={`mailto:${operator.email}`}>
              {operator.email}
            </a>{' '}
            ili {operator.phone}.
          </p>
        </div>
      </div>
    </div>
  )
}
