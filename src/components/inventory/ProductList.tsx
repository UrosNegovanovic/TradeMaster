'use client'

import { Product } from '@/types/product'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (productId: string) => void
  isDeleting?: string | null
}

export function ProductList({
  products,
  onEdit,
  onDelete,
  isDeleting,
}: ProductListProps) {
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
    }).format(numPrice)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  }

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Click &quot;Add Product&quot; to create your first product.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] sm:w-[100px]">Image</TableHead>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[100px]">SKU</TableHead>
              <TableHead className="min-w-[120px]">Category</TableHead>
              <TableHead className="text-right min-w-[100px]">Price</TableHead>
              <TableHead className="min-w-[140px] hidden lg:table-cell">Created</TableHead>
              <TableHead className="w-[120px] sm:w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {products.map((product) => (
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
                        // Fallback to placeholder on error
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
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {product.sku}
                </code>
              </TableCell>
              <TableCell>
                {product.category?.name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
            {formatPrice(Number(product.price))}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                {formatDate(product.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="px-2 sm:px-3"
                  >
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(product.id)}
                    disabled={isDeleting === product.id}
                    className="px-2 sm:px-3"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  )
}
