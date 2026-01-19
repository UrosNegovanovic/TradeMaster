'use client'

import { useState, useCallback, useMemo } from 'react'
import { Product } from '@/types/product'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Image as ImageIcon, Search } from 'lucide-react'
import Image from 'next/image'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'

interface ProductPickerProps {
  products: Product[]
  selectedProductIds: string[]
  onSelectionChange: (productIds: string[]) => void
}

export function ProductPicker({
  products,
  selectedProductIds,
  onSelectionChange,
}: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by search query (name or SKU)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((product) => product.categoryId === selectedCategory)
    }

    // Filter by date (only products created on selected date)
    if (selectedDate) {
      filtered = filtered.filter((product) => {
        const productDate = new Date(product.createdAt)
        const selectedDateOnly = new Date(selectedDate)
        
        // Compare only date parts (ignore time)
        return (
          productDate.getFullYear() === selectedDateOnly.getFullYear() &&
          productDate.getMonth() === selectedDateOnly.getMonth() &&
          productDate.getDate() === selectedDateOnly.getDate()
        )
      })
    }

    return filtered
  }, [products, searchQuery, selectedCategory, selectedDate])

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

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {selectedProductIds.length} of {filteredProducts.length} selected
        </div>
      </div>

      {/* Filters */}
      <InventoryFilters
        selectedCategory={selectedCategory}
        selectedDate={selectedDate}
        onCategoryChange={setSelectedCategory}
        onDateChange={setSelectedDate}
      />

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto">
          {filteredProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id)
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
                        {isValidImageUrl(product.imageUrl) ? (
                          <div className="relative h-16 w-16 rounded-md overflow-hidden border flex-shrink-0">
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
                          <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-muted flex-shrink-0">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{product.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            SKU: <code className="bg-muted px-1 rounded">{product.sku}</code>
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
