'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ownerNavigation } from './owner-navigation'

export function OwnerNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Panel vlasnika" className="mx-auto w-full max-w-5xl overflow-x-auto px-4">
      <ul className="flex gap-1 pb-2">
        {ownerNavigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              {item.ready ? (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10',
                    active && 'bg-white/15'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.name}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex min-h-11 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-white/50"
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.name}
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-normal">uskoro</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
