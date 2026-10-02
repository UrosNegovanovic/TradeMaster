import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { FREE_PERIOD } from '@/lib/landing-copy'

const authHighlights = [
  `${FREE_PERIOD} besplatno`,
  'Bez kartice',
  'Radi na telefonu i računaru',
] as const

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8">
        <TradeMasterWordmark size="md" showTagline />
      </div>
      <div className="flex w-full flex-col items-center gap-10 lg:max-w-4xl lg:flex-row lg:justify-center lg:gap-16">
        <div className="flex justify-center">{children}</div>
        <ul className="hidden space-y-3 lg:block">
          {authHighlights.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[15px] text-foreground">
              <Check className="h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
