'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CalendarIcon, ChevronDown, Package, Search, X, XCircle } from 'lucide-react'
import { Product } from '@/types/product'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ProductImage } from '@/components/shared/ProductImage'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type StockRow = Product & { totalQuantity: number }

const STOCK_PREVIEW_LIMIT = 10

interface CurrentStockTableProps {
  products: Product[]
}

function formatPrice(price: number | string) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
  }).format(numPrice)
}

function renderStockBadge(quantity: number, minStock: number) {
  if (quantity === 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Nema na stanju
      </Badge>
    )
  }

  if (quantity <= minStock) {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
        <AlertTriangle className="h-3 w-3" />
        {quantity} kom
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1 border-green-500 text-green-700 dark:text-green-400">
      <Package className="h-3 w-3" />
      {quantity} kom
    </Badge>
  )
}

function StockFilters({
  searchQuery,
  onSearchQueryChange,
  selectedDate,
  onSelectedDateChange,
  calendarOpen,
  onCalendarOpenChange,
  hasActiveFilters,
  onClearFilters,
  resultCount,
  sourceCount,
  totalValue,
  missingPriceCount,
}: {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedDate: Date | undefined
  onSelectedDateChange: (date: Date | undefined) => void
  calendarOpen: boolean
  onCalendarOpenChange: (open: boolean) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  resultCount: number
  sourceCount: number
  totalValue?: number
  missingPriceCount?: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pretraga po nazivu ili SKU..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal sm:w-[240px]',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Filter po datumu</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[70] w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    onSelectedDateChange(date)
                    onCalendarOpenChange(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={onClearFilters} title="Obriši filtere">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {totalValue !== undefined && (
          <div className="text-sm text-muted-foreground sm:text-right">
            <span className="font-semibold text-foreground">Ukupna vrednost:</span>{' '}
            {formatPrice(totalValue)}
            {missingPriceCount ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Bez {missingPriceCount} {missingPriceCount === 1 ? 'artikla kome' : 'artikala kojima'} nedostaje cena
              </p>
            ) : null}
          </div>
        )}
      </div>
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Pronađeno {resultCount} od {sourceCount} proizvoda
          {selectedDate ? ` on ${format(selectedDate, 'PPP')}` : ''}
        </p>
      )}
    </div>
  )
}

function StockEmptyState({
  hasActiveFilters,
  searchQuery,
  selectedDate,
  onClearFilters,
}: {
  hasActiveFilters: boolean
  searchQuery: string
  selectedDate: Date | undefined
  onClearFilters: () => void
}) {
  return (
    <div className="rounded-md border py-12 text-center">
      <Package className="mx-auto mb-3 h-12 w-12 opacity-50 text-muted-foreground" />
      <p className="text-muted-foreground">
        {hasActiveFilters ? (
          <>
            Nema proizvoda
            {searchQuery ? ` matching "${searchQuery}"` : ''}
            {selectedDate ? ` on ${format(selectedDate, 'PPP')}` : ''}
          </>
        ) : (
          'Nema proizvoda u magacinu'
        )}
      </p>
      {hasActiveFilters && (
        <Button variant="link" onClick={onClearFilters} className="mt-2">
          Obriši filtere
        </Button>
      )}
    </div>
  )
}

function StockProductList({ products }: { products: StockRow[] }) {
  return (
    <>
      <ul className="space-y-2 lg:hidden">
        {products.map((product) => (
          <li key={product.id} className="flex gap-3 rounded-xl border bg-card p-3">
            <ProductImage src={product.imageUrl} alt={product.name} size={56} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium leading-tight">{product.name}</p>
              <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {product.sku}
              </code>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {renderStockBadge(product.totalQuantity, product.minStock)}
                {Number(product.price) > 0 ? (
                  <span className="text-sm text-muted-foreground">{formatPrice(Number(product.price))}</span>
                ) : (
                  <Button asChild variant="outline" size="sm" className="h-8 border-amber-500 text-amber-700">
                    <Link href={`/inventory?edit=${product.id}`}>Nedostaje cena · Dodaj</Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right text-sm font-semibold">
              {Number(product.price) > 0 ? formatPrice(Number(product.price) * product.totalQuantity) : 'Nije izračunato'}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-md border lg:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Slika</TableHead>
                <TableHead className="min-w-[200px]">Proizvod</TableHead>
                <TableHead className="min-w-[120px]">Kategorija</TableHead>
                <TableHead className="min-w-[140px]">Stanje</TableHead>
                <TableHead className="min-w-[100px] text-right">Cena</TableHead>
                <TableHead className="min-w-[120px] text-right">Vrednost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <ProductImage src={product.imageUrl} alt={product.name} size={48} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{product.sku}</code>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category?.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{renderStockBadge(product.totalQuantity, product.minStock)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(product.price) > 0 ? formatPrice(Number(product.price)) : (
                      <Button asChild variant="outline" size="sm" className="border-amber-500 text-amber-700">
                        <Link href={`/inventory?edit=${product.id}`}>Nedostaje cena · Dodaj</Link>
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {Number(product.price) > 0 ? formatPrice(Number(product.price) * product.totalQuantity) : 'Nije izračunato'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}

export function CurrentStockTable({ products }: CurrentStockTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [stockOpen, setStockOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const dateFilteredProducts = useMemo(() => {
    if (!selectedDate) return products

    return products.filter((product) => {
      const productDate = new Date(product.createdAt)
      return (
        productDate.getFullYear() === selectedDate.getFullYear() &&
        productDate.getMonth() === selectedDate.getMonth() &&
        productDate.getDate() === selectedDate.getDate()
      )
    })
  }, [products, selectedDate])

  const aggregatedProducts = useMemo(() => {
    const productMap = new Map<string, StockRow>()

    dateFilteredProducts.forEach((product) => {
      const existing = productMap.get(product.sku)

      if (existing) {
        existing.totalQuantity += product.quantity
        if (new Date(product.createdAt) > new Date(existing.createdAt)) {
          productMap.set(product.sku, {
            ...product,
            totalQuantity: existing.totalQuantity,
          })
        }
      } else {
        productMap.set(product.sku, {
          ...product,
          totalQuantity: product.quantity,
        })
      }
    })

    return Array.from(productMap.values())
  }, [dateFilteredProducts])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return aggregatedProducts

    const query = searchQuery.toLowerCase().trim()
    return aggregatedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
    )
  }, [aggregatedProducts, searchQuery])

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedDate !== undefined
  const displayedProducts = filteredProducts.slice(0, STOCK_PREVIEW_LIMIT)
  const showAllCount = filteredProducts.length

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedDate(undefined)
  }

  const totalValue = useMemo(() => {
    return products.reduce((sum, product) => sum + Number(product.price) * product.quantity, 0)
  }, [products])
  const missingPriceCount = useMemo(
    () => aggregatedProducts.filter((product) => Number(product.price) <= 0).length,
    [aggregatedProducts]
  )

  const filterProps = {
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    selectedDate,
    onSelectedDateChange: setSelectedDate,
    calendarOpen: isCalendarOpen,
    onCalendarOpenChange: setIsCalendarOpen,
    hasActiveFilters,
    onClearFilters: clearFilters,
    resultCount: filteredProducts.length,
    sourceCount: aggregatedProducts.length,
  }

  return (
    <div className="space-y-4">
      <StockFilters {...filterProps} totalValue={totalValue} missingPriceCount={missingPriceCount} />

      {filteredProducts.length === 0 ? (
        <StockEmptyState
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          selectedDate={selectedDate}
          onClearFilters={clearFilters}
        />
      ) : (
        <StockProductList products={displayedProducts} />
      )}

      {filteredProducts.length > STOCK_PREVIEW_LIMIT && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setStockOpen(true)} className="gap-2">
            <ChevronDown className="h-4 w-4" />
            Prikaži sve ({showAllCount})
          </Button>
        </div>
      )}

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-[min(96vw,1120px)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pb-3 pt-6">
            <DialogTitle>Trenutno stanje</DialogTitle>
            <DialogDescription>Pregled proizvoda i količina ({showAllCount})</DialogDescription>
          </DialogHeader>
          <div className="shrink-0 px-6 pb-3">
            <StockFilters {...filterProps} totalValue={totalValue} missingPriceCount={missingPriceCount} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {filteredProducts.length === 0 ? (
              <StockEmptyState
                hasActiveFilters={hasActiveFilters}
                searchQuery={searchQuery}
                selectedDate={selectedDate}
                onClearFilters={clearFilters}
              />
            ) : (
              <StockProductList products={filteredProducts} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
