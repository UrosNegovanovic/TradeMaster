import Link from 'next/link'
import { TradeMasterMark } from '@/components/brand/TradeMasterMark'
import { SignOutControl } from '@/components/layout/SignOutControl'
import { OWNER_HOME_PATH } from '@/lib/platform-owner'
import { OwnerNav } from './OwnerNav'

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
        <OwnerNav />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
