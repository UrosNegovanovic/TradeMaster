import type { HTMLAttributes, ReactNode } from 'react'
import Image from 'next/image'
import { Check, Plus, Search } from 'lucide-react'
import { TradeMasterMark } from '@/components/brand/TradeMasterMark'
import { cn } from '@/lib/utils'
import { DEMO_INVOICE, demoInvoiceQrPayload, demoInvoiceTotals } from '@/lib/landing-invoice-demo'
import { ipsQrMatrix } from '@/lib/ips-qr'

const assortmentRows = [
  { name: 'Grand kafa 200 g', qty: '128', price: '329,00', img: '/landing/thumb-coffee.png' },
  { name: 'Next narandža 1 l', qty: '96', price: '149,00', img: '/landing/thumb-juice.png' },
  { name: 'Barilla Penne 500 g', qty: '74', price: '219,00', img: '/landing/thumb-pasta.png' },
  { name: 'Rosa voda 1,5 l', qty: '210', price: '62,00', img: '/landing/thumb-water.png' },
] as const

function PhoneChrome({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.7rem] border-[8px] border-neutral-950 bg-white shadow-[0_22px_44px_-20px_rgba(15,23,42,0.5)]',
        className
      )}
      {...rest}
    >
      <div className="flex items-center justify-center bg-white pt-1.5">
        <span className="h-3.5 w-[4.25rem] rounded-full bg-neutral-950" />
      </div>
      {children}
    </div>
  )
}

export function PhoneScanner({
  className,
  compact = false,
  priority = false,
}: {
  className?: string
  compact?: boolean
  priority?: boolean
}) {
  return (
    <PhoneChrome className={className} aria-hidden>
      <div className="px-3 pb-1 pt-2">
        <p className="text-[10px] font-medium text-muted-foreground">Skeniraj barkod</p>
      </div>
      <div
        className={cn(
          'relative mx-3 overflow-hidden rounded-xl bg-[#f3efe8]',
          compact ? 'aspect-[5/6]' : 'aspect-[3/4]'
        )}
      >
        <Image
          src="/landing/coffee-bag.png"
          alt=""
          fill
          sizes="220px"
          priority={priority}
          className="object-cover"
        />
        <div className="absolute inset-[14%] rounded-md border border-white/95 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]" />
        <span className="absolute left-[14%] top-[14%] h-3 w-3 rounded-tl border-l-2 border-t-2 border-white" />
        <span className="absolute right-[14%] top-[14%] h-3 w-3 rounded-tr border-r-2 border-t-2 border-white" />
        <span className="absolute bottom-[14%] left-[14%] h-3 w-3 rounded-bl border-b-2 border-l-2 border-white" />
        <span className="absolute bottom-[14%] right-[14%] h-3 w-3 rounded-br border-b-2 border-r-2 border-white" />
      </div>
      <div className="mx-3 mb-3 mt-2 flex items-start gap-2 rounded-[12px] bg-white px-2.5 py-2 shadow-sm ring-1 ring-black/5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <p className="text-[11px] font-medium leading-snug text-foreground">
          Proizvod dodat
          <span className="block text-[10px] font-normal text-muted-foreground">+1 komad</span>
        </p>
      </div>
    </PhoneChrome>
  )
}

const sidebarItems = [
  { label: 'Asortiman', active: true },
  { label: 'Magacin', active: false },
  { label: 'Katalozi', active: false },
  { label: 'Fakture', active: false },
  { label: 'Podešavanja', active: false },
] as const

export function AssortmentLaptop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'overflow-hidden rounded-[16px] border border-neutral-200/80 bg-white shadow-[0_28px_64px_-28px_rgba(15,23,42,0.32)]',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-neutral-200" />
        <span className="h-2 w-2 rounded-full bg-neutral-200" />
        <span className="h-2 w-2 rounded-full bg-neutral-200" />
        <div className="ml-1 flex flex-1 items-center gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>Pronađi proizvod, barkod ili šifru…</span>
        </div>
        <span className="hidden items-center gap-1 rounded-md bg-brand px-2 py-1 text-[10px] font-medium text-white sm:inline-flex">
          <Plus className="h-3 w-3" />
          Novi proizvod
        </span>
      </div>
      <div className="flex">
        <aside className="hidden w-[140px] shrink-0 border-r border-neutral-100 bg-[#fafafa] p-3 lg:block">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <TradeMasterMark className="h-4 w-4 text-brand" decorative />
            <span className="text-[11px] font-bold text-brand">TradeMaster</span>
          </div>
          <ul className="space-y-0.5">
            {sidebarItems.map((item) => (
              <li
                key={item.label}
                className={cn(
                  'rounded-md px-2 py-1.5 text-[11px] font-medium',
                  item.active ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-3">
          <p className="text-[15px] font-semibold text-foreground">Asortiman</p>
          <table className="mt-2 w-full text-left text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-neutral-100">
                <th className="pb-2 font-medium">Proizvod</th>
                <th className="pb-2 font-medium">Količina</th>
                <th className="pb-2 text-right font-medium">Cena (RSD)</th>
              </tr>
            </thead>
            <tbody>
              {assortmentRows.map((row) => (
                <tr key={row.name} className="border-b border-neutral-50 last:border-0">
                  <td className="py-2">
                    <span className="inline-flex items-center gap-2.5">
                      <Image
                        src={row.img}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-[6px] object-contain"
                      />
                      <span className="font-medium text-foreground">{row.name}</span>
                    </span>
                  </td>
                  <td className="py-2 tabular-nums text-muted-foreground">{row.qty}</td>
                  <td className="py-2 text-right tabular-nums text-foreground">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function FeatureShot({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div className={cn('relative h-[158px] overflow-hidden rounded-[12px] bg-[#f7f7f8] sm:h-[168px]', className)}>
      <Image src={src} alt={alt} fill sizes="(min-width: 640px) 360px, 100vw" className="object-cover object-left" />
    </div>
  )
}

function formatRsdAmount(value: number): string {
  return value.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Fictional invoice drawn in HTML: PDV per rate and a real IPS QR built from made-up data. */
export function InvoiceMock({ className }: { className?: string }) {
  const totals = demoInvoiceTotals()
  const payload = demoInvoiceQrPayload()
  const qr = payload ? ipsQrMatrix(payload) : null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[16px] border border-neutral-200/80 bg-white p-4 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-neutral-900">{DEMO_INVOICE.company}</p>
          <p className="text-[11px] text-neutral-500">Kupac: {DEMO_INVOICE.customer}</p>
        </div>
        <p className="shrink-0 text-[13px] font-semibold text-brand">Faktura {DEMO_INVOICE.number}</p>
      </div>

      <table className="mt-3 w-full text-[11px] tabular-nums sm:text-[12px]">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="pb-1 font-medium">Artikal</th>
            <th className="pb-1 text-right font-medium">Kol.</th>
            <th className="pb-1 text-right font-medium">PDV</th>
            <th className="pb-1 text-right font-medium">Iznos</th>
          </tr>
        </thead>
        <tbody className="text-neutral-800">
          {DEMO_INVOICE.lines.map((line) => (
            <tr key={line.name} className="border-b border-neutral-100">
              <td className="py-1 pr-2">{line.name}</td>
              <td className="py-1 text-right">{line.quantity}</td>
              <td className="py-1 text-right">{line.vatRate}%</td>
              <td className="py-1 text-right">{formatRsdAmount(line.quantity * line.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-end justify-between gap-3">
        {qr ? (
          <div className="shrink-0 text-center">
            <svg
              viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
              className="h-[72px] w-[72px] rounded-md border border-neutral-200 bg-white"
              role="img"
              aria-label="Primer QR koda za plaćanje"
            >
              <path d={qr.path} fill="#0f172a" />
            </svg>
            <p className="mt-1 text-[10px] text-neutral-500">QR za plaćanje</p>
          </div>
        ) : null}
        <dl className="min-w-0 flex-1 space-y-0.5 text-[11px] tabular-nums text-neutral-700 sm:text-[12px]">
          <div className="flex justify-between gap-3">
            <dt>Osnovica</dt>
            <dd>{formatRsdAmount(totals.osnovica)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>PDV 20%</dt>
            <dd>{formatRsdAmount(totals.vat20)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>PDV 10%</dt>
            <dd>{formatRsdAmount(totals.vat10)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-neutral-200 pt-1 text-[13px] font-semibold text-neutral-950">
            <dt>Za uplatu</dt>
            <dd>{formatRsdAmount(totals.total)} RSD</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
