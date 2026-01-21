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
import { Search, Package, XCircle, AlertTriangle, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'

interface CurrentStockTableProps {
  products: Product[]
}

export function CurrentStockTable({ products }: CurrentStockTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

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

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products

    const query = searchQuery.toLowerCase().trim()
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  // ✅ SMART COLLAPSE LOGIC with Search Override
  const isSearching = searchQuery.trim().length > 0
  const shouldLimit = !isExpanded && !isSearching
  const displayedProducts = shouldLimit ? filteredProducts.slice(0, 3) : filteredProducts

  // Calculate total inventory value
  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.price) * p.quantity), 0)
  }, [products])

  return (
    <div className="space-y-4">
      {/* Search Bar and Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Total Inventory Value:</span>{' '}
          {formatPrice(totalValue)}
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredProducts.length} of {products.length} products
        </p>
      )}

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 border rounded-md">
          <Package className="mx-auto h-12 w-12 mb-3 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery ? `No products found matching "${searchQuery}"` : 'No products in inventory'}
          </p>
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
                      {renderStockBadge(product.quantity)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(Number(product.price))}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatPrice(Number(product.price) * product.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ✅ SMART TOGGLE BUTTON - Only show if there are more than 3 products and not searching */}
      {filteredProducts.length > 3 && !isSearching && (
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
