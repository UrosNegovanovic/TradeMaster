import Link from 'next/link'
import {
  ScanBarcode,
  Warehouse,
  Share2,
  Receipt,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TradeMasterMark } from '@/components/brand/TradeMasterMark'
import { TradeMasterWordmark } from '@/components/brand/TradeMasterWordmark'
import { cn } from '@/lib/utils'

const jobs = [
  {
    n: '1',
    title: 'Skeniraj',
    hint: 'Barkod kamerom. Artikal u bazi, količina +1.',
    chip: 'Kamera',
    icon: ScanBarcode,
  },
  {
    n: '2',
    title: 'Lager',
    hint: 'Šta ima i šta je nisko. Ulaz skenerom, izlaz u Magacinu.',
    chip: 'Stanje',
    icon: Warehouse,
  },
  {
    n: '3',
    title: 'Katalog',
    hint: 'Popust po klijentu. PDF ili javni link.',
    chip: 'PDF · link',
    icon: Share2,
  },
  {
    n: '4',
    title: 'Faktura',
    hint: 'PIB, logo, status plaćeno. RSD.',
    chip: 'RSD · PIB',
    icon: Receipt,
  },
] as const

const who = [
  { title: 'Trgovac', line: 'Primaš robu i odmah šalješ cenu.' },
  { title: 'Veleprodaja', line: 'Asortiman, lager i račun na jednom mestu.' },
  { title: 'Mali magacin', line: 'Telefon u ruci. Sken umesto tabele.' },
] as const

const trust = ['Pregledač', 'PWA', 'RSD', 'PIB'] as const

function ShiftPanel({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Današnja smena
        </p>
        <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          U hali
        </span>
      </div>
      <ol className="relative mt-3">
        {jobs.map((job, index) => {
          const Icon = job.icon
          return (
            <li key={job.n} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {index < jobs.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-brand-tint"
                />
              ) : null}
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {job.n}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold leading-none">{job.title}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-primary">
                    <Icon className="h-3 w-3" />
                    {job.chip}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{job.hint}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ShiftDevice() {
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <TradeMasterMark
        decorative
        className="pointer-events-none absolute -right-10 -top-8 -z-10 h-56 w-56 text-primary opacity-[0.08]"
      />
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full bg-brand-mid/20 blur-3xl"
      />
      <div className="rounded-[2.35rem] bg-brand p-[11px] shadow-[0_28px_64px_-24px_rgba(26,110,92,0.55)]">
        <div className="overflow-hidden rounded-[1.85rem] bg-card">
          <div className="flex items-center justify-center pt-2">
            <span aria-hidden className="h-5 w-[7.25rem] rounded-full bg-foreground/85" />
          </div>
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <TradeMasterWordmark href="" size="sm" showTagline />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              PWA
            </span>
          </div>
          <div className="px-4 pb-2 pt-1">
            <ShiftPanel />
          </div>
          <div className="mt-1 grid grid-cols-5 items-end border-t bg-card px-1 pb-3 pt-2">
            <span className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
              Proizvodi
            </span>
            <span className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
              Magacin
            </span>
            <span className="-mt-3 flex flex-col items-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <ScanBarcode className="h-5 w-5" />
              </span>
              <span className="mt-1 text-[10px] font-semibold text-primary">Sken</span>
            </span>
            <span className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
              Ponude
            </span>
            <span className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
              Više
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-brand-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(80%_60%_at_12%_0%,#e8f5f1_0%,transparent_58%),radial-gradient(50%_40%_at_92%_8%,rgba(45,158,128,0.16)_0%,transparent_55%)]"
      />
      <header className="sticky top-0 z-40 border-b border-brand/10 bg-brand-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
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

      <main className="relative flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-20 lg:pt-16">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-mid">
              Trgovac · veleprodaja · mali magacin
            </p>
            <h1 className="mt-4 border-l-[3px] border-brand-mid pl-4 text-[2.05rem] font-bold leading-[1.08] tracking-tight text-foreground sm:pl-5 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
              Skeniraj robu.
              <br />
              Vidi lager.
              <br />
              Pošalji katalog.
              <br />
              <span className="text-brand-mid">Izdaj fakturu.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Od kamere u hali do PDF-a za klijenta. Jedan alat, bez Excel-a.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {trust.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-brand/15 bg-white/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7 hidden items-center gap-3 sm:flex">
              <Button size="lg" className="h-12 px-7 shadow-sm" asChild>
                <Link href="/sign-up">
                  Počni
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-12" asChild>
                <Link href="/sign-in">Već imaš nalog</Link>
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <div className="lg:hidden rounded-2xl border border-brand/10 bg-card p-4 shadow-[0_16px_40px_-24px_rgba(26,110,92,0.45)]">
              <ShiftPanel />
            </div>
            <div className="hidden lg:block">
              <ShiftDevice />
            </div>
          </div>
        </section>

        <section className="border-y border-brand/10 bg-brand-tint/80">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:gap-10 sm:px-6 sm:py-10">
            {who.map((item) => (
              <div key={item.title} className="min-w-0 border-l-2 border-brand-mid pl-3">
                <h2 className="text-sm font-semibold text-primary">{item.title}</h2>
                <p className="mt-1 text-sm leading-snug text-foreground">{item.line}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 pb-24 sm:px-6 sm:pb-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TradeMasterWordmark size="sm" showTagline href="/" />
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Radi u pregledaču na telefonu i računaru. Dodaj na početni ekran (PWA).
            Sopstveni domen kasnije — App Store nije potreban.
          </p>
        </div>
        <p className="mx-auto mt-4 max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} TradeMaster
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand/10 bg-brand-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <Button className="h-12 w-full shadow-sm" size="lg" asChild>
          <Link href="/sign-up">
            Počni
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
