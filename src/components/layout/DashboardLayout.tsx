import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { BackToTop } from './BackToTop'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overscroll-y-contain bg-background pt-[env(safe-area-inset-top)] lg:pt-0">
        <div className="container mx-auto py-4 pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] lg:py-6 lg:pb-6">
          {children}
        </div>
      </main>
      <MobileTabBar />
      <BackToTop />
    </div>
  )
}
