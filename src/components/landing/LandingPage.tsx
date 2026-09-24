import Link from 'next/link'
import { ArrowRight, Camera, FileText, Package, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { LandingDemo } from './LandingDemo'
import { AssortmentLaptop, FeatureShot, PhoneScanner } from './mocks'

const shell = 'mx-auto w-full max-w-[1800px] px-5 sm:px-6 lg:px-8'

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
    src: '/landing/card-scan.png',
  },
  {
    title: 'Lager i asortiman',
    line: 'Uvek znaš količine i pregled asortimana.',
    src: '/landing/card-stock.png',
  },
  {
    title: 'Katalozi i fakture',
    line: 'Profesionalni dokumenti za tvoje kupce.',
    src: '/landing/card-docs.png',
  },
] as const

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-100/80 bg-white/90 backdrop-blur">
        <div className={`${shell} flex h-[64px] items-center justify-between gap-3 lg:h-[72px]`}>
          <TradeMasterWordmark size="md" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="#kako-radi"
              className="hidden rounded-md px-2.5 py-2 text-[15px] text-neutral-600 hover:text-foreground lg:inline"
            >
              Kako radi
            </Link>
            <Link
              href="#funkcije"
              className="hidden rounded-md px-2.5 py-2 text-[15px] text-neutral-600 hover:text-foreground lg:inline"
            >
              Funkcije
            </Link>
            <Button variant="ghost" size="sm" className="text-[15px]" asChild>
              <Link href="/sign-in">Prijava</Link>
            </Button>
            <Button size="sm" className="hidden h-10 rounded-full px-4 lg:inline-flex" asChild>
              <Link href="/sign-up">
                Registruj se
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="flex flex-col lg:min-h-[calc(100svh-72px)]">
          <section className={`${shell} grid items-center gap-8 pb-10 pt-8 sm:gap-10 sm:pb-12 sm:pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:flex-1 lg:gap-8 lg:pb-14 lg:pt-12`}>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Za trgovce i malu veleprodaju
              </p>
              <h1 className="mt-3 text-[2.35rem] font-bold leading-[1.05] tracking-tight text-neutral-950 sm:text-[3.15rem] lg:text-[3.5rem] lg:leading-[1.04]">
                Skeniraj robu.
                <br />
                Drži lager pod kontrolom.
              </h1>
              <p className="mt-4 max-w-[26rem] text-[15px] leading-relaxed text-neutral-500 sm:text-base">
                Unesi proizvode kamerom telefona, prati zalihe i pripremi kataloge i
                fakture — iz jednog radnog prostora.
              </p>
              <div className="mt-6 hidden flex-wrap items-center gap-3 sm:flex">
                <Button size="lg" className="h-11 rounded-full px-6 shadow-sm" asChild>
                  <Link href="/sign-up">
                    Registruj se
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" className="h-11 rounded-full px-4 text-neutral-700" asChild>
                  <Link href="#kako-radi">
                    <Play className="mr-2 h-4 w-4" />
                    Pogledaj kako radi
                  </Link>
                </Button>
              </div>
              <p className="mt-4 hidden text-[13px] text-neutral-400 sm:block">
                Telefon i računar. Jedan pregled poslovanja.
              </p>
            </div>

            <div className="min-w-0">
              <div className="mx-auto w-[210px] lg:hidden">
                <PhoneScanner />
              </div>
              <div className="relative hidden lg:block">
                <AssortmentLaptop className="mr-16 xl:mr-20" />
                <div className="absolute -right-2 top-4 w-[188px] xl:right-0 xl:w-[200px]">
                  <PhoneScanner />
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-neutral-100">
            <div className={`${shell} grid gap-8 py-10 sm:grid-cols-3 sm:gap-10 sm:py-12`}>
              {benefits.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="min-w-0">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-brand text-white">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <h2 className="mt-3 text-[15px] font-semibold text-neutral-900">{item.title}</h2>
                    <p className="mt-1 text-[14px] leading-snug text-neutral-500">{item.line}</p>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <section
          id="kako-radi"
          aria-labelledby="kako-radi-heading"
          className="scroll-mt-[72px] py-12 sm:py-14"
        >
          <div className={`${shell} text-center`}>
            <h2
              id="kako-radi-heading"
              className="text-[1.75rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem] lg:text-[2.15rem]"
            >
              Od prvog skena do ponude kupcu.
            </h2>
            <p className="mt-2 text-[15px] text-neutral-500">
              Pogledaj kako izgleda rad u TradeMaster-u.
            </p>
            <div className="mt-7 text-left">
              <LandingDemo />
            </div>
          </div>
        </section>

        <section
          id="funkcije"
          aria-labelledby="funkcije-heading"
          className="scroll-mt-[72px] pb-12 sm:pb-14"
        >
          <div className={shell}>
            <h2
              id="funkcije-heading"
              className="text-center text-[1.75rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem] lg:text-[2.15rem]"
            >
              Sve što ti treba za svakodnevni rad.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-[16px] border border-neutral-200/80 bg-white p-3 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
                >
                  <FeatureShot src={item.src} alt="" />
                  <h3 className="mt-3 px-1 text-[15px] font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-1 px-1 pb-1 text-[14px] leading-snug text-neutral-500">{item.line}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${shell} pb-12 sm:pb-14`}>
          <div className="flex flex-col items-start justify-between gap-5 rounded-[16px] bg-brand px-6 py-7 text-white sm:flex-row sm:items-center sm:px-8 sm:py-8">
            <div className="max-w-xl">
              <h2 className="text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
                Pogledaj TradeMaster na svom asortimanu.
              </h2>
              <p className="mt-1.5 text-[14px] text-white/80 sm:text-[15px]">
                Otvori nalog i prođi kroz svoj radni dan.
              </p>
            </div>
            <Button
              size="lg"
              className="h-11 shrink-0 rounded-full bg-white px-6 text-brand hover:bg-white/95"
              asChild
            >
              <Link href="/sign-up">
                Registruj se
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 pb-24 pt-8 sm:pb-10">
        <div className={`${shell} flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <TradeMasterWordmark size="sm" href="/" />
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-neutral-400">
              Od skeniranja do pregleda poslovanja.
            </p>
          </div>
          <p className="text-[13px] text-neutral-400">© {new Date().getFullYear()} TradeMaster</p>
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
