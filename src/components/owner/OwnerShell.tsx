import Link from 'next/link'
import { TradeMasterMark } from '@/components/brand/TradeMasterMark'
import { SignOutControl } from '@/components/layout/SignOutControl'
import { OWNER_HOME_PATH } from '@/lib/platform-owner'
import { ownerNavigation } from './owner-navigation'

/**
 * Shell of the platform owner panel: a dark brand bar with its own menu, deliberately unlike the tenant
 * app (light sidebar) so the two are never confused. No link leads to a tenant page.
 */
export function OwnerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-surface">
      <header className="bg-brand text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href={OWNER_HOME_PATH} className="flex min-h-11 items-center gap-2.5">
            <TradeMasterMark className="h-8 w-8 text-white" />
            <span className="leading-tight">
              <span className="block text-base font-bold">TradeMaster</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
                Panel vlasnika
              </span>
            </span>
          </Link>
          <SignOutControl className="w-auto text-white/80 hover:bg-white/10 hover:text-white" />
        </div>
        <nav aria-label="Panel vlasnika" className="mx-auto w-full max-w-5xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-2">
            {ownerNavigation.map((item) => (
              <li key={item.href}>
                {item.ready ? (
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10"
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
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
