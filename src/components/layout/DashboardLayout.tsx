import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileTabBar } from './MobileTabBar'
import { BackToTop } from './BackToTop'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto overscroll-y-contain bg-background">
          <div className="container mx-auto py-4 pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] lg:py-6 lg:pb-6">
            {children}
          </div>
        </main>
      </div>
      <MobileTabBar />
      <BackToTop />
    </div>
  )
}
