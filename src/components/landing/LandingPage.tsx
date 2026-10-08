import Link from 'next/link'
import { ArrowRight, Camera, Check, FileText, MessageCircle, Package, Phone, Play, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { LandingDemo } from './LandingDemo'
import { LandingFooter } from './LandingFooter'
import { LandingInstall } from './LandingInstall'
import { LandingStickyCta } from './LandingStickyCta'
import { landingShell } from './landing-shell'
import { AssortmentLaptop, FeatureShot, InvoiceMock, PhoneScanner } from './mocks'
import {
  MONTHLY_PRICE,
  PRICING_OFFER,
  benefits as benefitCopy,
  contactLinks,
  dataPoints,
  faqs,
  heroLead,
  invoicePoints,
  landingContact,
  landingExamples,
  notList,
  pricingCardNote,
  pricingCardPeriod,
  pricingIncludes,
  pricingNote,
  workflowSteps,
} from '@/lib/landing-copy'
import { getSafeCatalogSharePath } from '@/lib/public-catalog'
import { getSafeInvoiceSharePath } from '@/lib/public-invoice'

const navLink =
  'inline-flex min-h-11 items-center rounded-md px-2.5 text-[15px] text-neutral-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const benefitIcons = [Camera, Package, FileText] as const
const benefits = benefitCopy.map((item, index) => ({ ...item, icon: benefitIcons[index] }))

const features = [
  {
    title: 'Skeniranje telefonom',
    line: 'Unos proizvoda kamerom, uz potvrdu kad je artikal upisan.',
    src: '/landing/card-scan.png',
    alt: 'Prikaz: telefon skenira kesu kafe, sa potvrdom da je proizvod dodat.',
  },
  {
    title: 'Lager i asortiman',
    line: 'Količine i cene na jednom mestu, na računaru i telefonu.',
    src: '/landing/card-stock.png',
    alt: 'Prikaz: tabela asortimana sa kafom, sokom, testeninom i vodom.',
  },
  {
    title: 'Katalozi i fakture',
    line: 'Katalog sa cenama i popustom, pa faktura sa PDV-om.',
    src: '/landing/card-docs.png',
    alt: 'Prikaz: katalog sa popustom pored fakture.',
  },
] as const

const contact = contactLinks(landingContact.phone)
const exampleCatalog = getSafeCatalogSharePath(landingExamples.catalogPath)
const exampleInvoice = getSafeInvoiceSharePath(landingExamples.invoicePath)

const sectionTitle = 'text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]'
const cardFrame =
  'rounded-[16px] border border-neutral-200/80 bg-white shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]'
const card = `${cardFrame} p-5`

/** Shown only once the owner has set a support phone (ROADMAP A1.5). */
function ContactLinks({ className }: { className?: string }) {
  if (!contact) return null
  return (
    <div className={className}>
      <p className="text-[14px] text-neutral-600">Pitanja? Javite nam se:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="min-h-11 rounded-full" asChild>
          <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </a>
        </Button>
        <Button variant="outline" size="sm" className="min-h-11 rounded-full" asChild>
          <a href={contact.viber}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Viber
          </a>
        </Button>
        <Button variant="outline" size="sm" className="min-h-11 rounded-full" asChild>
          <a href={contact.tel}>
            <Phone className="mr-2 h-4 w-4" />
            {contact.display}
          </a>
        </Button>
      </div>
    </div>
  )
}

function HeroActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button
        size="lg"
        className="hidden h-11 min-h-11 rounded-full px-6 shadow-sm lg:inline-flex"
        asChild
      >
        <Link href="/sign-up">
          Registrujte se
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-11 min-h-11 rounded-full border-neutral-200 px-4 text-neutral-800"
        asChild
      >
        <Link href="#kako-radi">
          <Play className="mr-2 h-4 w-4" />
          Pogledajte demo
        </Link>
      </Button>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <a
        href="#sadrzaj"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Preskoči na sadržaj
      </a>

      <header className="sticky top-0 z-40 border-b border-neutral-100/80 bg-white/90 backdrop-blur">
        <div className={`${landingShell} flex h-[64px] items-center justify-between gap-3 lg:h-[72px]`}>
          <TradeMasterWordmark size="sm" className="lg:hidden" />
          <TradeMasterWordmark size="md" className="hidden lg:inline-flex" />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Glavna">
            <Link href="#kako-radi" className={`hidden lg:inline-flex ${navLink}`}>
              Demo
            </Link>
            <Link href="#ceo-posao" className={`hidden lg:inline-flex ${navLink}`}>
              Kako radi
            </Link>
            <Link href="#pitanja" className={`hidden lg:inline-flex ${navLink}`}>
              Pitanja
            </Link>
            <Link href="#cena" className={`hidden lg:inline-flex ${navLink}`}>
              Cena
            </Link>
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

      <main id="sadrzaj" className="relative flex-1">
        <section className={`${landingShell} grid items-center gap-5 pb-8 pt-4 sm:gap-8 sm:pb-10 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:pb-12 lg:pt-10`}>
          <div className="order-2 min-w-0 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">
              Za trgovce i malu veleprodaju
            </p>
            <h1 className="mt-3 text-[2.1rem] font-bold leading-[1.12] tracking-tight text-neutral-950 sm:text-[3rem] lg:text-[3.25rem] lg:leading-[1.08]">
              Od barkoda
              <br />
              <span className="text-brand">do fakture.</span>
            </h1>
            <p className="mt-4 max-w-[36rem] text-[16px] leading-relaxed text-neutral-700 sm:text-[17px]">
              {heroLead}
            </p>
            <HeroActions className="mt-5 flex flex-wrap items-center gap-3" />
            <p className="mt-3 text-[14px] text-neutral-600">
              Jedan nalog po firmi. Radi u pregledaču. {PRICING_OFFER}.
            </p>
            <LandingInstall />
            <ContactLinks className="mt-5" />
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            <figure className="m-0 mx-auto w-[176px] lg:hidden">
              <PhoneScanner compact priority />
              <figcaption className="sr-only">Telefon skenira kesu kafe.</figcaption>
            </figure>
            <figure className="relative m-0 hidden lg:block">
              <AssortmentLaptop className="mr-16 xl:mr-20" />
              <div className="absolute -right-2 top-4 w-[188px] xl:right-0 xl:w-[200px]">
                <PhoneScanner />
              </div>
            </figure>
          </div>
        </section>

        <section className="border-y border-neutral-100" aria-labelledby="koristi-heading">
          <div className={`${landingShell} grid gap-8 py-8 sm:grid-cols-3 sm:gap-8 sm:py-10`}>
            <h2 id="koristi-heading" className="sr-only">
              Šta dobijate
            </h2>
            {benefits.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="min-w-0">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <h3 className="mt-3 text-[16px] font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-snug text-neutral-600">{item.line}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section
          id="ceo-posao"
          aria-labelledby="ceo-posao-heading"
          className="scroll-mt-[80px] py-10 sm:py-12"
        >
          <div className={landingShell}>
            <h2 id="ceo-posao-heading" className={`text-center ${sectionTitle}`}>
              Ceo posao iz telefona
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-neutral-600">
              Od robe na polici do uplate kupca, u šest koraka.
            </p>
            <ol className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <li key={step.title} className={`${cardFrame} flex gap-3 p-4 sm:block sm:p-5`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[14px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold text-neutral-900 sm:mt-3">{step.title}</h3>
                    <p className="mt-1 text-[15px] leading-snug text-neutral-600">{step.line}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="kako-radi"
          aria-labelledby="kako-radi-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={`${landingShell} text-center`}>
            <h2 id="kako-radi-heading" className={sectionTitle}>
              Pogledajte demo
            </h2>
            <div className="mt-6 text-left">
              <LandingDemo />
            </div>
            {exampleCatalog || exampleInvoice ? (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {exampleCatalog ? (
                  <Button variant="outline" className="min-h-11 rounded-full" asChild>
                    <a href={exampleCatalog} target="_blank" rel="noopener noreferrer">
                      Pogledajte primer kataloga
                    </a>
                  </Button>
                ) : null}
                {exampleInvoice ? (
                  <Button variant="outline" className="min-h-11 rounded-full" asChild>
                    <a href={exampleInvoice} target="_blank" rel="noopener noreferrer">
                      Pogledajte primer fakture
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section
          id="funkcije"
          aria-labelledby="funkcije-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={landingShell}>
            <h2
              id="funkcije-heading"
              className="text-center text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
            >
              Kako izgleda u radu
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] text-neutral-600">
              Isti artikli na skenu, lageru i dokumentima: kafa, sok, testenina, voda.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-[16px] border border-neutral-200/80 bg-white p-3 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
                >
                  <FeatureShot src={item.src} alt={item.alt} />
                  <h3 className="mt-3 px-1 text-[16px] font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-1 px-1 pb-1 text-[15px] leading-snug text-neutral-600">{item.line}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faktura"
          aria-labelledby="faktura-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={`${landingShell} grid items-center gap-6 lg:grid-cols-2 lg:gap-12`}>
            <div className="min-w-0">
              <h2
                id="faktura-heading"
                className="text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
              >
                Predračun, faktura i otpremnica
              </h2>
              <ul className="mt-5 space-y-3">
                {invoicePoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[16px] leading-snug text-neutral-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[14px] text-neutral-600">
                Interna faktura: nije fiskalni račun i ne šalje se u SEF.
              </p>
            </div>
            <figure className="m-0 min-w-0">
              <InvoiceMock />
              <figcaption className="mt-2 text-center text-[12px] text-neutral-500">
                Primer sa izmišljenim podacima.
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="nije-heading" className="pb-10 sm:pb-12">
          <div className={`${landingShell} grid gap-4 lg:grid-cols-2 lg:gap-5`}>
            <div className={card}>
              <h2 id="nije-heading" className="text-[1.3rem] font-bold tracking-tight text-neutral-950">
                Šta TradeMaster nije
              </h2>
              <ul className="mt-4 space-y-3">
                {notList.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-neutral-700">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2.4} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div id="podaci" className={`${card} scroll-mt-[80px]`}>
              <h2 className="text-[1.3rem] font-bold tracking-tight text-neutral-950">Vaši podaci</h2>
              <ul className="mt-4 space-y-3">
                {dataPoints.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-neutral-700">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[14px] text-neutral-600">
                Detalji su u{' '}
                <Link href="/privatnost" className="underline">
                  Obaveštenju o privatnosti
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section
          id="cena"
          aria-labelledby="cena-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={landingShell}>
            <h2
              id="cena-heading"
              className="text-center text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
            >
              Cena
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-neutral-600">
              Jedan paket, sve uključeno.
            </p>
            <article className="mx-auto mt-8 max-w-[420px] rounded-[16px] border border-neutral-200/80 bg-white p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] sm:p-7">
              <p className="text-[16px] font-semibold text-neutral-900">TradeMaster</p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="whitespace-nowrap text-[2.5rem] font-bold leading-none tracking-tight text-neutral-950">
                  {MONTHLY_PRICE}
                </span>
                <span className="text-[15px] text-neutral-600">{pricingCardPeriod}</span>
              </p>
              <ul className="mt-6 space-y-2.5">
                {pricingIncludes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-neutral-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-7 h-11 min-h-11 w-full rounded-full px-6 shadow-sm"
                asChild
              >
                <Link href="/sign-up">
                  Probajte besplatno
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </article>
            <p className="mt-4 text-center text-[14px] text-neutral-600">
              {pricingCardNote}
            </p>
            <p className="mt-1 text-center text-[12px] leading-relaxed text-neutral-500">
              {pricingNote}
            </p>
          </div>
        </section>

        <section
          id="pitanja"
          aria-labelledby="pitanja-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={landingShell}>
            <h2
              id="pitanja-heading"
              className="text-center text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
            >
              Pitanja
            </h2>
            <div className="mx-auto mt-6 max-w-[720px] divide-y divide-neutral-100 rounded-[16px] border border-neutral-200/80 bg-white">
              {faqs.map((item) => (
                <details key={item.q} className="group px-5 py-1">
                  <summary className="cursor-pointer list-none py-3 text-[16px] font-semibold text-neutral-900 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {item.q}
                      <span className="text-neutral-400 group-open:hidden" aria-hidden>
                        +
                      </span>
                      <span className="hidden text-neutral-400 group-open:inline" aria-hidden>
                        −
                      </span>
                    </span>
                  </summary>
                  <p className="pb-4 text-[15px] leading-relaxed text-neutral-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="rani-pristup-heading"
          className="border-t border-neutral-100 bg-brand-tint"
        >
          <div className={`${landingShell} py-8 sm:py-10`}>
            <h2 id="rani-pristup-heading" className="sr-only">
              Rani pristup
            </h2>
            <p className="mx-auto max-w-2xl text-center text-[16px] leading-relaxed text-neutral-800">
              Gradimo TradeMaster zajedno sa prvim trgovcima u Srbiji. {PRICING_OFFER}; naplata ručno. Prijavite se i pomozite da alat oblikujemo
              prema vašim potrebama.
            </p>
          </div>
        </section>

        <section className={`${landingShell} py-10 sm:py-12`}>
          <div
            id="zavrsi-cta"
            className="flex flex-col items-start justify-between gap-5 rounded-[16px] bg-brand px-6 py-7 text-white sm:flex-row sm:items-center sm:px-8 sm:py-8"
          >
            <div className="max-w-xl">
              <h2 className="text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
                Probajte TradeMaster na svom asortimanu.
              </h2>
              <p className="mt-1.5 text-[15px] text-white/90">
                Otvorite nalog, unesite podatke firme i skenirajte prvi proizvod.
              </p>
            </div>
            <Button
              size="lg"
              className="h-11 min-h-11 shrink-0 rounded-full bg-white px-6 text-brand hover:bg-white/95"
              asChild
            >
              <Link href="/sign-up">
                Registrujte se
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ContactLinks className="mt-6" />
        </section>
      </main>

      <LandingFooter stickyCtaPad />

      <LandingStickyCta />
    </div>
  )
}
