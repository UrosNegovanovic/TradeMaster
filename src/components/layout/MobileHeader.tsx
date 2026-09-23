import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 px-4 pb-0 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center">
        <TradeMasterWordmark href="/dashboard" size="sm" />
      </div>
    </header>
  )
}
