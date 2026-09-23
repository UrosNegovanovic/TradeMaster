import Link from 'next/link'
import {
  ScanBarcode,
  Warehouse,
  Share2,
  Receipt,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'

const jobs = [
  {
    n: '1',
    title: 'Skeniraj',
    hint: 'Barkod kamerom. Artikal u bazi, količina +1.',
    meta: 'Kamera',
    icon: ScanBarcode,
  },
  {
    n: '2',
    title: 'Lager',
    hint: 'Šta ima i šta je nisko. Ulaz skenerom, izlaz u Magacinu.',
    meta: 'Stanje',
    icon: Warehouse,
  },
  {
    n: '3',
    title: 'Katalog',
    hint: 'Popust po klijentu. PDF ili link.',
    meta: 'PDF · link',
    icon: Share2,
  },
  {
    n: '4',
    title: 'Faktura',
    hint: 'PIB, logo, status plaćeno.',
    meta: 'RSD · PIB',
    icon: Receipt,
  },
] as const

const who = [
  { title: 'Trgovac', line: 'Primaš robu i odmah šalješ cenu.' },
  { title: 'Veleprodaja', line: 'Asortiman, lager i račun na jednom mestu.' },
  { title: 'Mali magacin', line: 'Telefon u ruci. Sken umesto tabele.' },
] as const

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <TradeMasterWordmark size="sm" showTagline taglineClassName="hidden sm:block" />
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Prijava</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">
                Počni
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 lg:py-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Trgovac · veleprodaja · mali magacin
            </p>
            <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl">
              Skeniraj robu.
              <br />
              Vidi lager.
              <br />
              Pošalji katalog.
              <br />
              Izdaj fakturu.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              Od kamere u hali do PDF-a za klijenta. Jedan alat, bez Excel-a.
            </p>
            <div className="mt-7 hidden items-center gap-3 sm:flex">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Počni
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/sign-in">Već imaš nalog</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Današnja smena
            </p>
            <ol className="divide-y">
              {jobs.map((job) => {
                const Icon = job.icon
                return (
                  <li key={job.n} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {job.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold leading-none">{job.title}</p>
                        <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                          <Icon className="h-3.5 w-3.5" />
                          {job.meta}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{job.hint}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        <section className="border-t bg-secondary/80">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-3 sm:gap-8 sm:px-6 sm:py-10">
            {who.map((item) => (
              <div key={item.title} className="min-w-0">
                <h2 className="text-sm font-semibold text-primary">{item.title}</h2>
                <p className="mt-1 text-sm text-foreground">{item.line}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-6 pb-24 sm:px-6 sm:pb-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TradeMasterWordmark size="sm" showTagline href="/" />
          <p className="max-w-sm text-xs text-muted-foreground">
            Radi u pregledaču na telefonu i računaru. Sopstveni domen i App Store
            dolaze kasnije.
          </p>
        </div>
        <p className="mx-auto mt-4 max-w-5xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} TradeMaster
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <Button className="w-full" size="lg" asChild>
          <Link href="/sign-up">
            Počni
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
