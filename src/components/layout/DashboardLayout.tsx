import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { QuickScanButton } from '@/components/dashboard/QuickScanButton'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
          <MobileNav />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-primary">TradeMaster</h1>
          </div>
        </div>

        <div className="container mx-auto p-4 pb-28 md:p-6">
          {children}
        </div>
      </main>

      <div className="fixed z-40 md:hidden right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <QuickScanButton presentation="fab" />
      </div>
    </div>
  )
}
