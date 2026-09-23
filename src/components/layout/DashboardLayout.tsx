import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { BackToTop } from './BackToTop'
import Link from 'next/link'
import { QuickScanProvider } from '@/components/dashboard/QuickScanButton'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuickScanProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-background">
          <header className="border-b bg-card pt-[env(safe-area-inset-top)] lg:hidden">
            <div className="container mx-auto flex h-12 items-center">
              <Link href="/dashboard" aria-label="TradeMaster — Početna" className="inline-flex min-h-11 items-center rounded-md text-lg font-bold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                TradeMaster
              </Link>
            </div>
          </header>
          <div className="container mx-auto py-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:py-6 lg:pb-6">
            {children}
          </div>
        </main>
        <MobileTabBar />
        <BackToTop />
      </div>
    </QuickScanProvider>
  )
}
