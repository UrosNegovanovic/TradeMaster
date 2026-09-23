import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileTabBar } from './MobileTabBar'
import { BackToTop } from './BackToTop'
import { QuickScanProvider } from '@/components/dashboard/QuickScanButton'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuickScanProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-background">
            <div className="container mx-auto py-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:py-6 lg:pb-6">
              {children}
            </div>
          </main>
        </div>
        <MobileTabBar />
        <BackToTop />
      </div>
    </QuickScanProvider>
  )
}
