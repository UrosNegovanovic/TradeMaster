import Link from 'next/link'
import {
  ArrowRight,
  Camera,
  FileText,
  Package,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { LandingDemo } from './LandingDemo'
import { AssortmentLaptop, DocsMini, PhoneScanner, StockMini } from './mocks'

const benefits = [
  {
    title: 'Manje ručnog unosa',
    line: 'Skeniraj i dodaj proizvode za par sekundi.',
    icon: Camera,
  },
  {
    title: 'Pregled robe na jednom mestu',
    line: 'Uvek znaš šta imaš na stanju.',
    icon: Package,
  },
  {
    title: 'Ponuda spremna za kupca',
    line: 'Katalozi i fakture dođu do posla.',
    icon: FileText,
  },
] as const

const features = [
  {
    title: 'Skeniranje telefonom',
    line: 'Unos proizvoda kamerom, brzo i precizno.',
    visual: 'scan' as const,
  },
  {
    title: 'Lager i asortiman',
    line: 'Uvek znaš količine i pregled asortimana.',
    visual: 'stock' as const,
  },
  {
    title: 'Katalozi i fakture',
    line: 'Profesionalni dokumenti za tvoje kupce.',
    visual: 'docs' as const,
  },
] as const

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <TradeMasterWordmark size="sm" />
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="#kako-radi"
              className="hidden rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Kako radi
            </Link>
            <Link
              href="#funkcije"
              className="hidden rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Funkcije
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Prijava</Link>
            </Button>
            <Button size="sm" className="hidden rounded-full sm:inline-flex" asChild>
              <Link href="/sign-up">
                Registruj se
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 lg:pb-16 lg:pt-14">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Za trgovce i malu veleprodaju
            </p>
            <h1 className="mt-4 text-[2.15rem] font-bold leading-[1.08] tracking-tight text-neutral-950 sm:text-5xl lg:text-[3.15rem] lg:leading-[1.06]">
              Skeniraj robu.
              <br />
              Drži lager pod kontrolom.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Unesi proizvode kamerom telefona, prati zalihe i pripremi kataloge i
              fakture — iz jednog radnog prostora.
            </p>
            <div className="mt-7 hidden flex-wrap items-center gap-3 sm:flex">
              <Button size="lg" className="h-12 rounded-full px-7 shadow-sm" asChild>
                <Link href="/sign-up">
                  Registruj se
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-12 rounded-full" asChild>
                <Link href="#kako-radi">
                  <Play className="mr-2 h-4 w-4" />
                  Pogledaj kako radi
                </Link>
              </Button>
            </div>
            <p className="mt-5 hidden text-sm text-muted-foreground sm:block">
              Telefon i računar. Jedan pregled poslovanja.
            </p>
          </div>

          <div className="min-w-0">
            <div className="mx-auto w-[220px] sm:w-[240px] lg:hidden">
              <PhoneScanner />
            </div>
            <div className="relative hidden pr-16 lg:block xl:pr-20">
              <AssortmentLaptop />
              <div className="absolute -right-1 top-10 w-[168px] xl:-right-2 xl:w-[184px]">
                <PhoneScanner />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-neutral-100">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:gap-10 sm:px-6 sm:py-12">
            {benefits.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.line}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section
          id="kako-radi"
          aria-labelledby="kako-radi-heading"
          className="scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16"
        >
          <div className="mx-auto max-w-6xl text-center">
            <h2
              id="kako-radi-heading"
              className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl"
            >
              Od prvog skena do ponude kupcu.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Pogledaj kako izgleda rad u TradeMaster-u.
            </p>
            <div className="mt-8 text-left">
              <LandingDemo />
            </div>
          </div>
        </section>

        <section
          id="funkcije"
          aria-labelledby="funkcije-heading"
          className="scroll-mt-20 px-4 pb-12 sm:px-6 sm:pb-16"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="funkcije-heading"
              className="text-center text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl"
            >
              Sve što ti treba za svakodnevni rad.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.3)]"
                >
                  <div className="mb-4 min-h-[148px]">
                    {item.visual === 'scan' ? (
                      <div className="mx-auto w-[118px]">
                        <PhoneScanner compact />
                      </div>
                    ) : null}
                    {item.visual === 'stock' ? <StockMini className="mt-2" /> : null}
                    {item.visual === 'docs' ? <DocsMini className="mt-2" /> : null}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.line}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-brand px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10 sm:py-10">
            <div className="max-w-xl">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Pogledaj TradeMaster na svom asortimanu.
              </h2>
              <p className="mt-2 text-sm text-white/80 sm:text-base">
                Otvori nalog i prođi kroz svoj radni dan.
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 rounded-full bg-white px-7 text-brand hover:bg-white/95"
              asChild
            >
              <Link href="/sign-up">
                Registruj se
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 px-4 py-8 pb-24 sm:px-6 sm:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <TradeMasterWordmark size="sm" href="/" />
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Od skeniranja do pregleda poslovanja.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TradeMaster
          </p>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <Button className="h-12 w-full rounded-full shadow-sm" size="lg" asChild>
          <Link href="/sign-up">
            Registruj se
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
