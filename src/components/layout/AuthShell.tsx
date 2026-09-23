import type { ReactNode } from 'react'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8">
        <TradeMasterWordmark size="md" showTagline />
      </div>
      {children}
    </div>
  )
}
