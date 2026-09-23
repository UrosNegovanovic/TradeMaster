'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp, CalendarIcon, ChevronDown, Package, Search, X } from 'lucide-react'
import { MovementType } from '@prisma/client'
import { StockMovement } from '@/types/warehouse'
import { filterStockMovements } from '@/lib/stock-movement-filters'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type StockMovementHistoryProps = {
  movements: StockMovement[]
  totalCount: number
  isLoading: boolean
}

async function fetchAllStockMovements(): Promise<StockMovement[]> {
  const response = await fetch('/api/stock-movements?all=1')
  if (!response.ok) {
    throw new Error('Failed to fetch stock movements')
  }
  return response.json()
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function MovementFilters({
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
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
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
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Pronađeno {resultCount} od {sourceCount} kretanja
          {selectedDate ? ` on ${format(selectedDate, 'PPP')}` : ''}
        </p>
      )}
    </div>
  )
}

function MovementList({ movements }: { movements: StockMovement[] }) {
  return (
    <div>
      <ul className="space-y-2 lg:hidden">
        {movements.map((movement) => (
          <li key={movement.id} className="flex items-start gap-3 rounded-xl border p-3">
            {movement.type === MovementType.IN ? (
              <Badge variant="default" className="mt-0.5 bg-green-600">
                <ArrowUp className="mr-1 h-3 w-3" />
                UL
              </Badge>
            ) : (
              <Badge variant="destructive" className="mt-0.5">
                <ArrowDown className="mr-1 h-3 w-3" />
                IZ
              </Badge>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium leading-tight">{movement.product.name}</p>
              <p className="text-xs text-muted-foreground">
                {movement.product.sku} · {formatDate(movement.createdAt)}
              </p>
              {movement.reason ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{movement.reason}</p>
              ) : null}
            </div>
            <span className="shrink-0 font-semibold">
              {movement.type === MovementType.IN ? '+' : '-'}
              {movement.quantity}
            </span>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Proizvod</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead className="text-right">Količina</TableHead>
              <TableHead>Razlog</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="whitespace-nowrap">{formatDate(movement.createdAt)}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{movement.product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {movement.product.sku}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {movement.type === MovementType.IN ? (
                    <Badge variant="default" className="bg-green-500">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      IN
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <ArrowDown className="mr-1 h-3 w-3" />
                      OUT
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {movement.type === MovementType.IN ? '+' : '-'}
                  {movement.quantity}
                </TableCell>
                <TableCell className="max-w-xs truncate">{movement.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function StockMovementHistory({
  movements,
  totalCount,
  isLoading,
}: StockMovementHistoryProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const { data: allMovements, isLoading: isLoadingAll } = useQuery({
    queryKey: ['stockMovements', 'all'],
    queryFn: fetchAllStockMovements,
    enabled: historyOpen,
  })

  const previewFiltered = useMemo(
    () => filterStockMovements(movements, searchQuery, selectedDate),
    [movements, searchQuery, selectedDate]
  )
  const overlaySource = allMovements ?? movements
  const overlayFiltered = useMemo(
    () => filterStockMovements(overlaySource, searchQuery, selectedDate),
    [overlaySource, searchQuery, selectedDate]
  )

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedDate !== undefined
  const showAllCount = Math.max(totalCount, overlaySource.length, movements.length)

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedDate(undefined)
  }

  const filterProps = {
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    selectedDate,
    onSelectedDateChange: setSelectedDate,
    calendarOpen: isCalendarOpen,
    onCalendarOpenChange: setIsCalendarOpen,
    hasActiveFilters,
    onClearFilters: clearFilters,
  }

  return (
    <>
      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Loading movements...</p>
      ) : movements.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">
            No stock movements yet. Use the Inventory Scanner to add products, or register stock out
            movements above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <MovementFilters
            {...filterProps}
            resultCount={previewFiltered.length}
            sourceCount={movements.length}
          />
          {previewFiltered.length === 0 ? (
            <div className="rounded-md border py-12 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nema kretanja
                {searchQuery ? ` matching "${searchQuery}"` : ''}
                {selectedDate ? ` on ${format(selectedDate, 'PPP')}` : ''}
              </p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Obriši filtere
              </Button>
            </div>
          ) : (
            <MovementList movements={previewFiltered} />
          )}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Prikaži sve ({showAllCount})
            </Button>
          </div>
        </div>
      )}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="flex h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-[min(96vw,1120px)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pb-3 pt-6">
            <DialogTitle>Istorija kretanja</DialogTitle>
            <DialogDescription>
              Svi ulazi i izlazi ({showAllCount})
            </DialogDescription>
          </DialogHeader>
          <div className="shrink-0 px-6 pb-3">
            <MovementFilters
              {...filterProps}
              resultCount={overlayFiltered.length}
              sourceCount={overlaySource.length}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {isLoadingAll && !allMovements ? (
              <p className="py-8 text-center text-muted-foreground">Loading movements...</p>
            ) : overlayFiltered.length === 0 ? (
              <div className="rounded-md border py-12 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'Nema kretanja za izabrane filtere' : 'Nema kretanja'}
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Obriši filtere
                  </Button>
                )}
              </div>
            ) : (
              <MovementList movements={overlayFiltered} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
