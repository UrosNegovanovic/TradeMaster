import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { LandingFooter } from './LandingFooter'
import { landingShell } from './landing-shell'

type LegalDocumentProps = {
  title: string
  updated: string
  children: ReactNode
}

export function LegalDocument({ title, updated, children }: LegalDocumentProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-100/80 bg-white/90 backdrop-blur">
        <div className={`${landingShell} flex h-[64px] items-center justify-between gap-3 lg:h-[72px]`}>
          <TradeMasterWordmark size="sm" className="lg:hidden" />
          <TradeMasterWordmark size="md" className="hidden lg:inline-flex" />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Nalog">
            <Button variant="ghost" size="sm" className="min-h-11 px-2.5 text-[15px] sm:px-3" asChild>
              <Link href="/sign-in">Prijava</Link>
            </Button>
            <Button size="sm" className="h-10 min-h-11 rounded-full px-3 sm:px-4" asChild>
              <Link href="/sign-up">
                Registrujte se
                <ArrowRight className="ml-1.5 hidden h-4 w-4 sm:inline" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

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
