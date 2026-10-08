import type { ReactNode } from 'react'
import { LandingFooter } from './LandingFooter'
import { MarketingHeader } from './MarketingHeader'
import { landingShell } from './landing-shell'

type LegalDocumentProps = {
  title: string
  updated: string
  children: ReactNode
}

export function LegalDocument({ title, updated, children }: LegalDocumentProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <MarketingHeader />

      <main className={`${landingShell} flex-1 py-10 sm:py-12`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">
          TradeMaster
        </p>
        <h1 className="mt-3 max-w-[40rem] text-[2rem] font-bold leading-tight tracking-tight text-neutral-950 sm:text-[2.25rem]">
          {title}
        </h1>
        <p className="mt-2 text-[14px] text-neutral-500">{updated}</p>
        <div className="mt-8 max-w-[720px] space-y-8 text-[15px] leading-relaxed text-neutral-700">
          {children}
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[1.05rem] font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  )
}
