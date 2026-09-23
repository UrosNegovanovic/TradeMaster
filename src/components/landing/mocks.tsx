import type { ReactNode } from 'react'
import { Check, Search } from 'lucide-react'
import { TradeMasterMark } from '@/components/brand/TradeMasterMark'
import { cn } from '@/lib/utils'

export const assortmentRows = [
  { name: 'Grand kafa 200 g', qty: '128', price: '329,00', tone: 'bg-[#4a2c1a]' },
  { name: 'Next naranča 1 l', qty: '96', price: '149,00', tone: 'bg-[#e29b2e]' },
  { name: 'Barilla Penne 500 g', qty: '74', price: '219,00', tone: 'bg-[#1d4f91]' },
  { name: 'Rosa voda 1,5 l', qty: '210', price: '62,00', tone: 'bg-[#6aa8c9]' },
] as const

export function CoffeeBag({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-[#2b1810] shadow-sm',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-0 h-2 bg-[#1a100b]" />
      <div className="mx-[12%] mt-[22%] rounded-[3px] bg-[#d7b48a] px-1 py-1.5 text-center">
        <p className="text-[10px] font-black uppercase leading-none tracking-wide text-[#2b1810]">
          grand
        </p>
        <p className="mt-0.5 text-[6px] font-semibold uppercase tracking-[0.14em] text-[#6b4e2e]">
          gold
        </p>
      </div>
      <div className="absolute inset-x-[14%] bottom-[14%] space-y-[1.5px] rounded-[2px] bg-white px-1 py-1">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="block h-[1.5px] bg-neutral-900"
            style={{ width: i % 3 === 0 ? '72%' : '100%' }}
          />
        ))}
      </div>
    </div>
  )
}

function PhoneChrome({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.85rem] border-[7px] border-neutral-900 bg-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]',
        className
      )}
    >
      <div className="flex items-center justify-center bg-white pt-1.5">
        <span className="h-3.5 w-16 rounded-full bg-neutral-900" />
      </div>
      {title ? (
        <p className="px-3 pt-2 text-[10px] font-medium text-muted-foreground">{title}</p>
      ) : null}
      {children}
    </div>
  )
}

export function PhoneScanner({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <PhoneChrome className={className} title="Skeniraj barkod">
      <div
        className={cn(
          'relative mx-3 mb-3 mt-2 overflow-hidden rounded-xl bg-[#ece8e2]',
          compact ? 'aspect-[4/5]' : 'aspect-[3/4]'
        )}
      >
        <CoffeeBag className="absolute left-1/2 top-[18%] h-[52%] w-[42%] -translate-x-1/2" />
        <div className="absolute inset-[18%] rounded-lg border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
        <div className="absolute left-[18%] right-[18%] top-1/2 h-px bg-red-500/80" />
      </div>
      <div className="mx-3 mb-4 flex items-start gap-2 rounded-xl bg-white px-2.5 py-2 shadow-sm ring-1 ring-black/5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <p className="text-[11px] font-medium leading-snug text-foreground">
          Proizvod dodat
          <span className="block text-[10px] font-normal text-muted-foreground">
            +1 komad
          </span>
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
      className={cn(
        'overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)]',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-neutral-200" />
        <span className="h-2 w-2 rounded-full bg-neutral-200" />
        <span className="h-2 w-2 rounded-full bg-neutral-200" />
        <div className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-neutral-50 px-2 py-1 text-[10px] text-muted-foreground">
          <Search className="h-3 w-3" />
          <span>Pronađi proizvod, barkod ili SKU…</span>
        </div>
      </div>
      <div className="flex min-h-[240px]">
        <aside className="hidden w-[132px] shrink-0 border-r border-neutral-100 bg-neutral-50/80 p-2.5 sm:block">
          <div className="mb-3 flex items-center gap-1.5 px-1">
            <TradeMasterMark className="h-4 w-4 text-brand" decorative />
            <span className="text-[10px] font-bold text-brand">TradeMaster</span>
          </div>
          <ul className="space-y-0.5">
            {sidebarItems.map((item) => (
              <li
                key={item.label}
                className={cn(
                  'rounded-md px-2 py-1.5 text-[10px] font-medium',
                  item.active ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1 p-3">
          <p className="text-sm font-semibold text-foreground">Asortiman</p>
          <table className="mt-2 w-full text-left text-[10px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-neutral-100">
                <th className="pb-1.5 font-medium">Proizvod</th>
                <th className="pb-1.5 font-medium">Količina</th>
                <th className="pb-1.5 text-right font-medium">Cena po komadu</th>
              </tr>
            </thead>
            <tbody>
              {assortmentRows.map((row) => (
                <tr key={row.name} className="border-b border-neutral-50 last:border-0">
                  <td className="py-1.5">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn('h-6 w-6 rounded-md', row.tone)} />
                      {row.name}
                    </span>
                  </td>
                  <td className="py-1.5 tabular-nums">{row.qty}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function CatalogStage({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl bg-[#f3f4f6]', className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_40%,#ffffff_0%,transparent_70%)]" />
      <div className="relative hidden h-full items-center justify-center p-8 lg:flex">
        <div className="w-[min(72%,640px)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand">
              <TradeMasterMark className="h-3.5 w-3.5 text-brand" decorative />
              TradeMaster
            </span>
            <span className="text-[10px] text-muted-foreground">Katalog proizvoda</span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {assortmentRows.slice(0, 3).map((row) => (
              <div key={row.name} className="rounded-lg border border-neutral-100 p-2">
                <span className={cn('block h-12 w-full rounded-md', row.tone)} />
                <p className="mt-1.5 truncate text-[10px] font-medium">{row.name}</p>
                <p className="text-[10px] tabular-nums text-muted-foreground">{row.price} RSD</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute left-[6%] top-[18%] w-[150px]">
          <PhoneScanner />
        </div>
      </div>
      <div className="relative flex h-full items-end justify-center p-6 lg:hidden">
        <div className="w-[168px]">
          <PhoneScanner />
        </div>
      </div>
    </div>
  )
}

export function StockMini({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-neutral-200 bg-white', className)}>
      <table className="w-full text-left text-[10px]">
        <thead className="text-muted-foreground">
          <tr className="border-b border-neutral-100">
            <th className="px-2 py-1.5 font-medium">Proizvod</th>
            <th className="px-2 py-1.5 font-medium">Stanje</th>
            <th className="px-2 py-1.5 text-right font-medium">Cena</th>
          </tr>
        </thead>
        <tbody>
          {assortmentRows.map((row) => (
            <tr key={row.name} className="border-b border-neutral-50 last:border-0">
              <td className="px-2 py-1.5">{row.name}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.qty}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{row.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DocsMini({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <div className="rounded-xl border border-neutral-200 bg-white p-2">
        <p className="mb-1 text-[9px] font-medium text-muted-foreground">Katalog proizvoda</p>
        <div className="space-y-1.5">
          {assortmentRows.slice(0, 2).map((row) => (
            <div key={row.name} className="flex items-center gap-1.5">
              <span className={cn('h-7 w-7 rounded-md', row.tone)} />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium">{row.name}</p>
                <p className="text-[9px] tabular-nums text-muted-foreground">{row.price} RSD</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-2">
        <p className="text-[9px] font-medium text-muted-foreground">Faktura</p>
        <div className="mt-2 h-1.5 w-2/3 rounded bg-neutral-200" />
        <div className="mt-2 space-y-1">
          <div className="h-1 w-full rounded bg-neutral-100" />
          <div className="h-1 w-5/6 rounded bg-neutral-100" />
          <div className="h-1 w-4/6 rounded bg-neutral-100" />
        </div>
        <p className="mt-3 text-right text-[10px] font-semibold tabular-nums">1.280,00 RSD</p>
      </div>
    </div>
  )
}
