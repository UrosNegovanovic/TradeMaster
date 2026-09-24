import type { HTMLAttributes, ReactNode } from 'react'
import Image from 'next/image'
import { Check, Plus, Search } from 'lucide-react'
import { TradeMasterMark } from '@/components/brand/TradeMasterMark'
import { cn } from '@/lib/utils'

const assortmentRows = [
  { name: 'Grand kafa 200 g', qty: '128', price: '329,00', img: '/landing/thumb-coffee.png' },
  { name: 'Next naranča 1 l', qty: '96', price: '149,00', img: '/landing/thumb-juice.png' },
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
          <span>Pronađi proizvod, barkod ili SKU…</span>
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
