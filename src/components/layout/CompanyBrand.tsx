'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/profile'

function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url || url.trim() === '') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

async function fetchProfile(): Promise<Profile> {
  const response = await fetch('/api/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

type CompanyBrandProps = {
  className?: string
  compact?: boolean
  onNavigate?: () => void
}

export function CompanyBrand({ className, compact = false, onNavigate }: CompanyBrandProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 60_000,
  })

  const companyName = profile?.companyName?.trim() || null
  const rawLogoUrl = profile?.logoUrl
  const logoUrl = isValidImageUrl(rawLogoUrl) && rawLogoUrl !== failedLogoUrl ? rawLogoUrl : null

  if (!companyName && !rawLogoUrl) {
    return null
  }

  const markClass = compact ? 'h-10 w-10' : 'h-11 w-11'

  return (
    <div className={cn('min-w-0', className)}>
      <Link
        href="/settings"
        onClick={onNavigate}
        aria-label={companyName ? `Firma: ${companyName}` : 'Logo firme'}
        className={cn(
          'flex min-h-12 min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {logoUrl ? (
          <span
            className={cn(
              'relative shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm',
              markClass
            )}
          >
            <Image
              src={logoUrl}
              alt=""
              fill
              unoptimized
              sizes="44px"
              className="object-contain p-1"
              onError={() => setFailedLogoUrl(rawLogoUrl ?? null)}
            />
          </span>
        ) : (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-xs font-semibold text-primary',
              markClass
            )}
            aria-hidden
          >
            {companyInitials(companyName || 'Firma')}
          </span>
        )}

        {companyName ? (
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Firma
            </span>
            <span title={companyName} className="block break-words text-sm font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
              {companyName}
            </span>
          </span>
        ) : null}
      </Link>
    </div>
  )
}
