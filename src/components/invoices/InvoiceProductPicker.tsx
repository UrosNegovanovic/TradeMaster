'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Product } from '@/types/product'
import { pickerProductForId, productsForPicker } from '@/lib/product-picker'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function InvoiceProductMeta({
  name,
  sku,
  stock,
}: {
  name: string
  sku?: string | null
  stock?: number | null
}) {
  return (
    <div className="min-w-0 space-y-0.5 tracking-normal">
      <p className="break-words text-sm font-medium leading-snug [overflow-wrap:anywhere]">
        {name}
      </p>
      {sku ? (
        <p className="break-words text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]">
          SKU: {sku}
        </p>
      ) : null}
      {stock != null ? (
        <p className="break-words text-xs leading-snug text-muted-foreground">
          Na stanju: {stock} kom
        </p>
      ) : null}
    </div>
  )
}

export function invoiceProductAriaLabel(product: Pick<Product, 'name' | 'sku' | 'quantity'>) {
  return `${product.name}, SKU ${product.sku}, na stanju ${product.quantity} kom`
}

interface InvoiceProductPickerProps {
  products: Product[]
  value: string | null
  onChange: (productId: string | null) => void
  id?: string
}

export function InvoiceProductPicker({
  products,
  value,
  onChange,
  id,
}: InvoiceProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const pickerProducts = useMemo(() => productsForPicker(products), [products])
  const selected = pickerProductForId(products, value)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pickerProducts
    return pickerProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle)
    )
  }, [pickerProducts, query])

  const aria = selected ? invoiceProductAriaLabel(selected) : 'Izaberi proizvod'

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <button
        id={id}
        type="button"
        aria-label={aria}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full min-w-0 items-start justify-between gap-3 rounded-md border border-input bg-background px-3 py-2.5 text-left tracking-normal ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {selected ? (
          <InvoiceProductMeta
            name={selected.name}
            sku={selected.sku}
            stock={selected.quantity}
          />
        ) : (
          <span className="text-sm leading-snug text-muted-foreground">Izaberi proizvod</span>
        )}
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <SheetContent
        side="bottom"
        className="flex h-[min(85dvh,640px)] flex-col gap-3 rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      >
        <SheetHeader className="shrink-0 space-y-1 pr-12 text-left">
          <SheetTitle className="text-left text-lg leading-snug tracking-normal">
            Izaberi proizvod
          </SheetTitle>
          <SheetDescription className="sr-only">
            Lista proizvoda sa nazivom, šifrom i stanjem u odvojenim redovima.
          </SheetDescription>
        </SheetHeader>

        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Traži naziv ili SKU"
            className="h-11 pl-9"
            aria-label="Traži proizvod"
          />
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label="Proizvodi"
        >
          <PickerRow
            selected={!value}
            onSelect={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            <span className="text-sm leading-snug text-muted-foreground">Izaberi proizvod</span>
          </PickerRow>

          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm leading-snug text-muted-foreground">
              Nema proizvoda.
            </p>
          ) : (
            filtered.map((product) => (
              <PickerRow
                key={product.sku}
                selected={selected?.sku === product.sku}
                onSelect={() => {
                  const current = value ? products.find((row) => row.id === value) : undefined
                  onChange(current?.sku === product.sku && value ? value : product.id)
                  setOpen(false)
                }}
                ariaLabel={invoiceProductAriaLabel(product)}
              >
                <InvoiceProductMeta
                  name={product.name}
                  sku={product.sku}
                  stock={product.quantity}
                />
              </PickerRow>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PickerRow({
  selected,
  onSelect,
  children,
  ariaLabel,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        'flex min-h-14 w-full items-start gap-3 border-b border-border px-1 py-3 text-left tracking-normal last:border-b-0',
        selected && 'bg-accent/50'
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-input"
        aria-hidden
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
      </span>
    </button>
  )
}
