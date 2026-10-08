import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { MarketingHeader } from '@/components/landing/MarketingHeader'
import { landingShell } from '@/components/landing/landing-shell'
import { PRICING_OFFER } from '@/lib/landing-copy'
import { tradePageBySlug, tradePagePath, tradePages } from '@/lib/trade-pages'

/** Pages per trade (ROADMAP A2.11), built at deploy time; any other /za/… is 404. */
export const dynamicParams = false

export function generateStaticParams() {
  return tradePages.map((page) => ({ slug: page.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = tradePageBySlug(params.slug)
  if (!page) return {}
  const path = tradePagePath(page)
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: path },
    openGraph: { type: 'website', locale: 'sr_RS', url: path, title: page.title, description: page.description, siteName: 'TradeMaster' },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
  }
}

export default function TradePageRoute({ params }: { params: { slug: string } }) {
  const page = tradePageBySlug(params.slug)
  if (!page) notFound()
  const others = tradePages.filter((other) => other.slug !== page.slug)

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <MarketingHeader />

      <main className={`${landingShell} flex-1 py-10 sm:py-12`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">TradeMaster</p>
        <h1 className="mt-3 max-w-[40rem] text-[2rem] font-bold leading-tight tracking-tight text-neutral-950 sm:text-[2.6rem]">
          {page.h1}
        </h1>
        <p className="mt-4 max-w-[40rem] text-[16px] leading-relaxed text-neutral-700 sm:text-[17px]">{page.lead}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" className="h-11 min-h-11 rounded-full px-6" asChild>
            <Link href="/sign-up">
              Probajte besplatno
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 min-h-11 rounded-full px-5" asChild>
            <Link href="/#kako-radi">Pogledajte demo</Link>
          </Button>
        </div>
        <p className="mt-3 text-[14px] text-neutral-600">{PRICING_OFFER}. Bez kartice.</p>

        <section aria-labelledby="danas-heading" className="mt-12 max-w-[720px]">
          <h2 id="danas-heading" className="text-[1.4rem] font-bold tracking-tight text-neutral-950">
            Kako to izgleda danas
          </h2>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-neutral-700">
            {page.today.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-neutral-400">–</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sa-trademaster-heading" className="mt-12">
          <h2 id="sa-trademaster-heading" className="text-[1.4rem] font-bold tracking-tight text-neutral-950">
            Sa TradeMaster-om
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map((feature) => (
              <li
                key={feature.title}
                className="rounded-[16px] border border-neutral-200/80 bg-white p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
              >
                <h3 className="flex items-start gap-2 text-[16px] font-semibold text-neutral-900">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
                  {feature.title}
                </h3>
                <p className="mt-1 text-[15px] leading-snug text-neutral-600">{feature.line}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pitanja-heading" className="mt-12 max-w-[720px]">
          <h2 id="pitanja-heading" className="text-[1.4rem] font-bold tracking-tight text-neutral-950">
            Pitanja
          </h2>
          <dl className="mt-4 space-y-4">
            {page.faq.map((item) => (
              <div key={item.q}>
                <dt className="text-[16px] font-semibold text-neutral-900">{item.q}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-neutral-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label="Za koga još" className="mt-12 border-t border-neutral-100 pt-6 text-[15px] text-neutral-700">
          TradeMaster je napravljen i za:{' '}
          {others.map((other, index) => (
            <span key={other.slug}>
              {index > 0 ? ', ' : ''}
              <Link href={tradePagePath(other)} className="underline">
                {/* "Za male proizvođače" → "male proizvođače": the accusative after "za". */}
                {other.h1.replace(/^Za /, '')}
              </Link>
            </span>
          ))}
          .
        </nav>
      </main>

      <LandingFooter />
    </div>
  )
}
