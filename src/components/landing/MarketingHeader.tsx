import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { landingShell } from './landing-shell'

/** Header of the public pages (legal, trade pages): wordmark, Prijava, Registrujte se. */
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100/80 bg-white/90 backdrop-blur">
      <div className={`${landingShell} flex h-[64px] items-center justify-between gap-3 lg:h-[72px]`}>
        <TradeMasterWordmark size="sm" href="/" className="lg:hidden" />
        <TradeMasterWordmark size="md" href="/" className="hidden lg:inline-flex" />
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
  )
}
