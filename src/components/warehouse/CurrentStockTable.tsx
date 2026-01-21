'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types/product'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Search, Package, XCircle, AlertTriangle, Image as ImageIcon, ChevronDown, ChevronUp, CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface CurrentStockTableProps {
  products: Product[]
}

export function CurrentStockTable({ products }: CurrentStockTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Format price
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
    }).format(numPrice)
  }

  // Check if image URL is valid
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Render stock status badge based on quantity
  const renderStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Out of Stock
        </Badge>
      )
    } else if (quantity <= 10) {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          {quantity} units
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700 dark:text-green-400">
          <Package className="h-3 w-3" />
          {quantity} units
        </Badge>
      )
    }
  }

  // ✅ Filter products by date FIRST (before aggregation)
  const dateFilteredProducts = useMemo(() => {
    if (!selectedDate) return products

    return products.filter((product) => {
      const productDate = new Date(product.createdAt)
      const selectedDateOnly = new Date(selectedDate)
      
      // Compare only date parts (ignore time)
      return (
        productDate.getFullYear() === selectedDateOnly.getFullYear() &&
        productDate.getMonth() === selectedDateOnly.getMonth() &&
        productDate.getDate() === selectedDateOnly.getDate()
      )
    })
  }, [products, selectedDate])

  // ✅ AGGREGATE products by SKU (sum quantities from different days)
  const aggregatedProducts = useMemo(() => {
    const productMap = new Map<string, Product & { totalQuantity: number }>()

    dateFilteredProducts.forEach((product) => {
      const existing = productMap.get(product.sku)
      
      if (existing) {
        // SKU already exists, sum the quantity
        existing.totalQuantity += product.quantity
        // Keep the most recent price and other details
        if (new Date(product.createdAt) > new Date(existing.createdAt)) {
          productMap.set(product.sku, {
            ...product,
            totalQuantity: existing.totalQuantity,
          })
        } else {
          existing.totalQuantity = existing.totalQuantity
        }
      } else {
        // First entry for this SKU
        productMap.set(product.sku, {
          ...product,
          totalQuantity: product.quantity,
        })
      }
    })

    return Array.from(productMap.values())
  }, [dateFilteredProducts])

  // ✅ Filter aggregated products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return aggregatedProducts

    const query = searchQuery.toLowerCase().trim()
    return aggregatedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
    )
  }, [aggregatedProducts, searchQuery])

  // ✅ Check if any filters are active
  const hasActiveFilters = searchQuery.trim().length > 0 || selectedDate !== undefined

  // ✅ SMART COLLAPSE LOGIC with Search/Date Override
  const shouldLimit = !isExpanded && !hasActiveFilters
  const displayedProducts = shouldLimit ? filteredProducts.slice(0, 3) : filteredProducts

  // ✅ Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedDate(undefined)
  }

  // Calculate total inventory value
  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.price) * p.quantity), 0)
  }, [products])

  return (
    <div className="space-y-4">
      {/* Filters and Summary */}
      <div className="flex flex-col gap-4">
        {/* Search, Date Filter, and Total Value */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Filter */}
            <div className="flex gap-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full sm:w-[240px] justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : <span>Filter by date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date)
                      setIsCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  title="Clear all filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Total Value */}
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">Total Value:</span>{' '}
            {formatPrice(totalValue)}
          </div>
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Found {filteredProducts.length} of {aggregatedProducts.length} products
            {selectedDate && ` on ${format(selectedDate, 'PPP')}`}
          </p>
        )}
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 border rounded-md">
          <Package className="mx-auto h-12 w-12 mb-3 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">
            {hasActiveFilters ? (
              <>
                No products found
                {searchQuery && ` matching "${searchQuery}"`}
                {selectedDate && ` on ${format(selectedDate, 'PPP')}`}
              </>
            ) : (
              'No products in inventory'
            )}
          </p>
          {hasActiveFilters && (
            <Button
              variant="link"
              onClick={clearFilters}
              className="mt-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead className="min-w-[200px]">Product</TableHead>
                  <TableHead className="min-w-[120px]">Category</TableHead>
                  <TableHead className="min-w-[140px]">Stock Status</TableHead>
                  <TableHead className="text-right min-w-[100px]">Unit Price</TableHead>
                  <TableHead className="text-right min-w-[120px]">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {isValidImageUrl(product.imageUrl) ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                          <Image
                            src={product.imageUrl!}
                            alt={product.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-md border flex items-center justify-center bg-muted">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {product.sku}
                          </code>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderStockBadge(product.totalQuantity)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(Number(product.price))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPrice(Number(product.price) * product.totalQuantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ✅ SMART TOGGLE BUTTON - Only show if there are more than 3 products and no filters active */}
      {filteredProducts.length > 3 && !hasActiveFilters && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show All ({filteredProducts.length} products)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
