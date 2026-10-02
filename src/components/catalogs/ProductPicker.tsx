'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Product } from '@/types/product'
import { Category } from '@/types/category'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Search } from 'lucide-react'
import { ProductImage } from '@/components/shared/ProductImage'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'
import { isSameLocalDay } from '@/lib/local-date'
import { UNCATEGORIZED_LABEL } from '@/lib/catalog-layout'
import {
  NO_CATEGORY,
  categoryKey,
  countByCategory,
  deselectAll,
  filterPickerProducts,
  selectAll,
  toggleCategory,
} from '@/lib/catalog-picker'
import { cn } from '@/lib/utils'

interface ProductPickerProps {
  products: Product[]
  selectedProductIds: string[]
  onSelectionChange: (productIds: string[]) => void
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  return response.json()
}

export function ProductPicker({
  products,
  selectedProductIds,
  onSelectionChange,
}: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  // Only categories that actually have products are offered, plus "Ostalo" for products without one.
  const categoryChips = useMemo(() => {
    const used = new Set(products.map(categoryKey))
    const names = new Map(categories.map((category) => [category.id, category.name]))
    for (const product of products) {
      if (product.category) names.set(product.category.id, product.category.name)
    }
    const chips = Array.from(used)
      .filter((key) => key !== NO_CATEGORY)
      .map((key) => ({ key, label: names.get(key) ?? 'Kategorija' }))
      .sort((a, b) => a.label.localeCompare(b.label, 'sr-Latn'))
    if (used.has(NO_CATEGORY)) chips.push({ key: NO_CATEGORY, label: UNCATEGORIZED_LABEL })
    return chips
  }, [products, categories])

  const filteredProducts = useMemo(
    () =>
      filterPickerProducts(products, {
        query: searchQuery,
        categories: selectedCategories,
        matchesDate: selectedDate ? (createdAt) => isSameLocalDay(new Date(createdAt), selectedDate) : null,
      }),
    [products, searchQuery, selectedCategories, selectedDate]
  )

  const counts = useMemo(
    () => countByCategory(products, selectedProductIds, categoryChips.map((chip) => chip.key)),
    [products, selectedProductIds, categoryChips]
  )
  const countByKey = useMemo(() => new Map(counts.map((count) => [count.key, count])), [counts])
  const selectedSummary = counts.filter((count) => count.selected > 0)

  const visibleIds = useMemo(() => filteredProducts.map((product) => product.id), [filteredProducts])
  const selectedSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))

  // Memoize toggleProduct to prevent unnecessary re-renders
  const toggleProduct = useCallback(
    (productId: string) => {
      const isCurrentlySelected = selectedProductIds.includes(productId)

      // Create new array to avoid mutation issues
      const newSelection = isCurrentlySelected
        ? selectedProductIds.filter((id) => id !== productId)
        : [...selectedProductIds, productId]

      // Always call onSelectionChange - the check for actual change is handled
      // by the parent component's useEffect that compares stringified arrays
      onSelectionChange(newSelection)
    },
    [selectedProductIds, onSelectionChange]
  )

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
    }).format(numPrice)
  }

  const labelOf = (key: string) => categoryChips.find((chip) => chip.key === key)?.label ?? 'Kategorija'

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pretraga po nazivu ili šifri..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Izabrano {selectedProductIds.length} · prikazano {filteredProducts.length}
        </div>
      </div>

      {/* Categories: pick as many as needed, then select everything shown in one click */}
      {categoryChips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Kategorije</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter po kategorijama">
            <Button
              type="button"
              size="sm"
              variant={selectedCategories.length === 0 ? 'default' : 'outline'}
              className="min-h-9"
              aria-pressed={selectedCategories.length === 0}
              onClick={() => setSelectedCategories([])}
            >
              Sve ({products.length})
            </Button>
            {categoryChips.map((chip) => {
              const active = selectedCategories.includes(chip.key)
              const count = countByKey.get(chip.key)
              return (
                <Button
                  key={chip.key}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="min-h-9"
                  aria-pressed={active}
                  onClick={() => setSelectedCategories((current) => toggleCategory(current, chip.key))}
                >
                  {chip.label} ({count?.total ?? 0})
                  {count && count.selected > 0 ? (
                    <span
                      className={cn(
                        'ml-1.5 rounded-full px-1.5 text-xs',
                        active ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
                      )}
                    >
                      ✓ {count.selected}
                    </span>
                  ) : null}
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Možete izabrati više kategorija. Dugme „Izaberi sve prikazane“ dodaje sve proizvode iz izabranih kategorija.
          </p>
        </div>
      ) : null}

      {/* Date filter */}
      <InventoryFilters
        hideCategory
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          disabled={visibleIds.length === 0 || allVisibleSelected}
          onClick={() => onSelectionChange(selectAll(selectedProductIds, visibleIds))}
        >
          Izaberi sve prikazane ({visibleIds.length})
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9"
          disabled={!visibleIds.some((id) => selectedSet.has(id))}
          onClick={() => onSelectionChange(deselectAll(selectedProductIds, visibleIds))}
        >
          Poništi prikazane
        </Button>
        {selectedProductIds.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9"
            onClick={() => onSelectionChange([])}
          >
            Poništi sve
          </Button>
        ) : null}
      </div>

      {selectedSummary.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          U katalogu:{' '}
          {selectedSummary.map((count, index) => (
            <span key={count.key}>
              {index > 0 ? ', ' : ''}
              <span className="font-medium text-foreground">{labelOf(count.key)}</span> {count.selected}
            </span>
          ))}
        </p>
      ) : null}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nema proizvoda za izabrane filtere.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto">
          {filteredProducts.map((product) => {
            const isSelected = selectedSet.has(product.id)
            return (
              <Card
                key={product.id}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleProduct(product.id)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked !== isSelected) {
                            toggleProduct(product.id)
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          size={64}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{product.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Šifra: <code className="bg-muted px-1 rounded">{product.sku}</code>
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            {formatPrice(Number(product.price))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
