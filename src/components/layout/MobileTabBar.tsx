'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickScanButton } from '@/components/dashboard/QuickScanButton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CompanyBrand } from './CompanyBrand'
import { mobileMoreNavigation, mobileTabNavigation } from './navigation'

function isActivePath(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`))
}

export function MobileTabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = mobileMoreNavigation.some((item) => isActivePath(pathname, item.href))

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 overflow-visible border-t bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
        aria-label="Glavna navigacija"
      >
        <div className="grid h-16 grid-cols-5 items-end px-1">
          {mobileTabNavigation.slice(0, 2).map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-1 text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}

          <div className="relative flex min-h-12 items-end justify-center pb-1">
            <div className="absolute -top-7">
              <QuickScanButton presentation="fab" />
            </div>
            <span className="pb-1 text-[11px] font-medium text-muted-foreground">Sken</span>
          </div>

          {mobileTabNavigation.slice(2).map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-1 text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-1 text-[11px] font-medium',
              moreActive ? 'text-primary' : 'text-muted-foreground'
            )}
            aria-label="Više"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Više</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] lg:hidden"
        >
          <SheetHeader>
            <SheetTitle className="text-left">Više</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <QuickScanButton presentation="hero" />
          </div>
          <nav className="mt-3 grid gap-1">
            {mobileMoreNavigation.map((item) => {
              const Icon = item.icon
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <CompanyBrand
            className="mt-4 border-t pt-3"
            onNavigate={() => setMoreOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
