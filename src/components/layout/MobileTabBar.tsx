'use client'

import { useEffect, useState } from 'react'
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
  SheetDescription,
  SheetTrigger,
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

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setMoreOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => { setMoreOpen(false) }, [pathname])

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 overflow-visible border-t bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
        aria-label="Glavna navigacija"
      >
        <div className="grid min-h-20 grid-cols-5 items-end px-1">
          {mobileTabNavigation.slice(0, 2).map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 pb-2 pt-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}

          <div className="-mt-3 flex flex-col items-center justify-end gap-1 pb-2">
            <QuickScanButton presentation="fab" />
            <span aria-hidden="true" className="text-xs font-medium text-primary">Sken</span>
          </div>

          {mobileTabNavigation.slice(2).map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 pb-2 pt-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}

          <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 pb-2 pt-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              moreActive ? 'text-primary' : 'text-muted-foreground'
            )}
            aria-label="Više"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Više</span>
          </button>
          </SheetTrigger>
        </div>
      </nav>

        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:hidden"
        >
          <SheetHeader className="shrink-0 pr-12">
            <SheetTitle className="text-left">Više</SheetTitle>
            <SheetDescription className="sr-only">Ostale stranice i podaci vaše firme.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
          <nav className="mt-3 grid gap-1">
            {mobileMoreNavigation.map((item) => {
              const Icon = item.icon
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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
          </div>
        </SheetContent>
      </Sheet>
  )
}
