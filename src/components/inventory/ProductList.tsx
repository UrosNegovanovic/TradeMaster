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
import { Pencil, Trash2 } from 'lucide-react'
import { ProductImage } from '@/components/shared/ProductImage'

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (productId: string) => void
  isDeleting?: string | null
}

function formatPrice(price: number | string) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
  }).format(numPrice)
}

function formatDate(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj)
}

function formatDateTime(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

export function ProductList({
  products,
  onEdit,
  onDelete,
  isDeleting,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Nema proizvoda.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Dodajte prvi proizvod ili ga skenirajte.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2 lg:hidden">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex gap-3 rounded-xl border bg-card p-3 shadow-sm"
          >
            <ProductImage src={product.imageUrl} alt={product.name} size={56} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium leading-tight">{product.name}</p>
              <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {product.sku}
              </code>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{formatPrice(Number(product.price))}</span>
                <span className="text-muted-foreground">
                  {product.category?.name ?? 'Bez kategorije'}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-between">
              <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
                {product.quantity}
              </span>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(product)}
                  className="h-11 w-11"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Izmeni</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(product.id)}
                  disabled={isDeleting === product.id}
                  className="h-11 w-11"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Obriši</span>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-md border lg:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Slika</TableHead>
                <TableHead className="min-w-[180px]">Naziv</TableHead>
                <TableHead className="min-w-[120px]">SKU</TableHead>
                <TableHead className="min-w-[120px]">Kategorija</TableHead>
                <TableHead className="min-w-[80px] text-right">Količina</TableHead>
                <TableHead className="min-w-[100px] text-right">Cena</TableHead>
                <TableHead className="min-w-[110px]">Dodato</TableHead>
                <TableHead className="w-[120px]">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <ProductImage src={product.imageUrl} alt={product.name} size={48} />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-sm">{product.sku}</code>
                  </TableCell>
                  <TableCell>
                    {product.category?.name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className="inline-flex min-w-[40px] items-center justify-center rounded-md bg-primary/10 px-2 py-1 text-primary">
                      {product.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(Number(product.price))}
                  </TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground"
                    title={formatDateTime(product.createdAt)}
                  >
                    {formatDate(product.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Izmeni</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(product.id)}
                        disabled={isDeleting === product.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Obriši</span>
                      </Button>
                    </div>
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
