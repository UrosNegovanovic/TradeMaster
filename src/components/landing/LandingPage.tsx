import Link from 'next/link'
import { ArrowRight, Camera, FileText, Package, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { LandingDemo } from './LandingDemo'
import { LandingInstall } from './LandingInstall'
import { LandingStickyCta } from './LandingStickyCta'
import { AssortmentLaptop, FeatureShot, PhoneScanner } from './mocks'

const shell = 'mx-auto w-full max-w-[1240px] px-5 lg:px-8'

const navLink =
  'inline-flex min-h-11 items-center rounded-md px-2.5 text-[15px] text-neutral-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const benefits = [
  {
    title: 'Manje ručnog unosa',
    line: 'Skeniraj barkod i skrati unos podataka o proizvodu.',
    icon: Camera,
  },
  {
    title: 'Pregled robe na jednom mestu',
    line: 'Prati količine i pronađi proizvod kada ti zatreba.',
    icon: Package,
  },
  {
    title: 'Ponuda spremna za kupca',
    line: 'Pripremi katalog sa cenama i popustom za kupca.',
    icon: FileText,
  },
] as const

const steps = [
  {
    n: '1',
    title: 'Otvori nalog i podesi firmu',
    line: 'Registruj se, pa u Podešavanjima unesi naziv, PIB i kontakt koji idu na katalog i fakturu.',
  },
  {
    n: '2',
    title: 'Dodaj ili skeniraj prvi proizvod',
    line: 'Otvori skener na telefonu ili unesi artikal ručno. Ako barkod nije pronađen, dopuni naziv i cenu.',
  },
  {
    n: '3',
    title: 'Pregledaj magacin i pripremi katalog',
    line: 'Vidi količine u Magacinu, sastavi katalog sa cenama i popustom, pa pošalji PDF ili link.',
  },
] as const

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
    line: 'Katalog sa cenama i popustom, i faktura u RSD.',
    src: '/landing/card-docs.png',
    alt: 'Prikaz: katalog sa popustom pored fakture.',
  },
] as const

const faqs = [
  {
    q: 'Radi li na telefonu i računaru?',
    a: 'Da. TradeMaster je veb-aplikacija: isti nalog i isti lager u pregledaču na telefonu i računaru.',
  },
  {
    q: 'Da li moram da instaliram aplikaciju?',
    a: 'Ne. Otvoriš je u pregledaču. Nema posebne aplikacije na App Store ili Google Play.',
  },
  {
    q: 'Šta ako barkod nije pronađen?',
    a: 'Ako artikal nije u tvom asortimanu, sistem potraži javne baze. Ako ga ni tamo nema, otvara se forma da uneseš naziv i cenu. Nije svaki barkod u bazi.',
  },
  {
    q: 'Da li je potreban internet?',
    a: 'Da. TradeMaster radi online. Offline rad nije dostupan.',
  },
  {
    q: 'Kako kupac dobija katalog?',
    a: 'Pripremiš katalog sa cenama i popustom, pa pošalješ PDF ili link. Link otvara pregled bez prijave — dovoljno je znati adresu.',
  },
] as const

function HeroActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button size="lg" className="h-11 min-h-11 rounded-full px-6 shadow-sm" asChild>
        <Link href="/sign-up">
          Registruj se
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
          Pogledaj demo
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
        <div className={`${shell} flex h-[64px] items-center justify-between gap-3 lg:h-[72px]`}>
          <TradeMasterWordmark size="md" />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Glavna">
            <Link href="#kako-radi" className={`hidden lg:inline-flex ${navLink}`}>
              Demo
            </Link>
            <Link href="#kako-pocinjes" className={`hidden lg:inline-flex ${navLink}`}>
              Početak
            </Link>
            <Link href="#pitanja" className={`hidden lg:inline-flex ${navLink}`}>
              Pitanja
            </Link>
            <Button variant="ghost" size="sm" className="min-h-11 text-[15px]" asChild>
              <Link href="/sign-in">Prijava</Link>
            </Button>
            <Button size="sm" className="hidden h-10 min-h-11 rounded-full px-4 lg:inline-flex" asChild>
              <Link href="/sign-up">
                Registruj se
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="sadrzaj" className="relative flex-1">
        <section className={`${shell} grid items-center gap-6 pb-8 pt-6 sm:gap-8 sm:pb-10 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:pb-12 lg:pt-10`}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">
              Za trgovce i malu veleprodaju
            </p>
            <h1 className="mt-3 text-[2.1rem] font-bold leading-[1.12] tracking-tight text-neutral-950 sm:text-[3rem] lg:text-[3.25rem] lg:leading-[1.08]">
              Skeniraj robu.
              <br />
              <span className="text-brand">Drži lager pod kontrolom.</span>
            </h1>
            <p className="mt-4 max-w-[36rem] text-[16px] leading-relaxed text-neutral-700 sm:text-[17px]">
              Unosi proizvode kamerom telefona, prati zalihe i pripremi kataloge i
              fakture — na telefonu i računaru.
            </p>
            <HeroActions className="mt-5 flex flex-wrap items-center gap-3" />
            <p className="mt-3 text-[14px] text-neutral-600">
              Jedan nalog po firmi. Radi u pregledaču.
            </p>
            <LandingInstall />
          </div>

          <div className="min-w-0">
            <figure className="m-0 mx-auto w-[156px] lg:hidden">
              <PhoneScanner compact priority />
              <figcaption className="sr-only">
                Prikaz proizvoda: sken kafe na telefonu. Nije snimak tvog magacina.
              </figcaption>
            </figure>
            <figure className="relative m-0 hidden lg:block">
              <AssortmentLaptop className="mr-16 xl:mr-20" />
              <div className="absolute -right-2 top-4 w-[188px] xl:right-0 xl:w-[200px]">
                <PhoneScanner />
              </div>
              <figcaption className="mt-3 text-[13px] text-neutral-600">
                Prikaz proizvoda: asortiman na računaru i sken na telefonu. Nije
                snimak demo-firme.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-y border-neutral-100" aria-labelledby="koristi-heading">
          <div className={`${shell} grid gap-8 py-8 sm:grid-cols-3 sm:gap-8 sm:py-10`}>
            <h2 id="koristi-heading" className="sr-only">
              Šta dobijaš
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
          id="kako-radi"
          aria-labelledby="kako-radi-heading"
          className="scroll-mt-[80px] py-10 sm:py-12"
        >
          <div className={`${shell} text-center`}>
            <h2
              id="kako-radi-heading"
              className="text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
            >
              Pogledaj demo
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-600">
              Ceo kadar, bez isečka. Pusti kad hoćeš — bez automatskog zvuka.
            </p>
            <div className="mt-6 text-left">
              <LandingDemo />
            </div>
          </div>
        </section>

        <section
          id="kako-pocinjes"
          aria-labelledby="kako-pocinjes-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={shell}>
            <h2
              id="kako-pocinjes-heading"
              className="text-center text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
            >
              Kako počinješ
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-neutral-600">
              Nema posebnog čarobnjaka. Ovo je stvarni redosled posle registracije.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="rounded-[16px] border border-neutral-200/80 bg-white p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[14px] font-semibold text-white">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-[16px] font-semibold text-neutral-900">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-snug text-neutral-600">{step.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="funkcije"
          aria-labelledby="funkcije-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={shell}>
            <h2
              id="funkcije-heading"
              className="text-center text-[1.65rem] font-bold tracking-tight text-neutral-950 sm:text-[2rem]"
            >
              Kako izgleda u radu
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] text-neutral-600">
              Ilustracije sa istim artiklima (kafa, sok, testenina, voda). Nisu
              snimci tuđeg naloga.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-[16px] border border-neutral-200/80 bg-white p-3 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)]"
                >
                  <FeatureShot src={item.src} alt={item.alt} />
                  <p className="mt-2 px-1 text-[12px] font-medium uppercase tracking-wide text-neutral-500">
                    Prikaz proizvoda
                  </p>
                  <h3 className="mt-1 px-1 text-[16px] font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-1 px-1 pb-1 text-[15px] leading-snug text-neutral-600">{item.line}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pitanja"
          aria-labelledby="pitanja-heading"
          className="scroll-mt-[80px] pb-10 sm:pb-12"
        >
          <div className={shell}>
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

        <section className={`${shell} pb-10 sm:pb-12`}>
          <div
            id="zavrsi-cta"
            className="flex flex-col items-start justify-between gap-5 rounded-[16px] bg-brand px-6 py-7 text-white sm:flex-row sm:items-center sm:px-8 sm:py-8"
          >
            <div className="max-w-xl">
              <h2 className="text-[1.35rem] font-bold tracking-tight sm:text-[1.6rem]">
                Pogledaj TradeMaster na svom asortimanu.
              </h2>
              <p className="mt-1.5 text-[15px] text-white/90">
                Otvori nalog, unesi firmu i dodaj prvi proizvod.
              </p>
            </div>
            <Button
              size="lg"
              className="h-11 min-h-11 shrink-0 rounded-full bg-white px-6 text-brand hover:bg-white/95"
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
        <div className={`${shell} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <TradeMasterWordmark size="sm" href="/" />
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-neutral-600">
              Sken, lager, katalog i faktura. Jedan nalog po firmi. Radi u
              pregledaču.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[14px] text-neutral-600 sm:items-end">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link
                href="/sign-in"
                className="min-h-11 inline-flex items-center underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Prijava
              </Link>
              <Link
                href="/sign-up"
                className="min-h-11 inline-flex items-center underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Registruj se
              </Link>
            </div>
            <p>© {new Date().getFullYear()} TradeMaster</p>
          </div>
        </div>
      </footer>

      <LandingStickyCta />
    </div>
  )
}
