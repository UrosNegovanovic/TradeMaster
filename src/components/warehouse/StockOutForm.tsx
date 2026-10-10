'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react'
import { Product } from '@/types/product'
import { pickerProductForId, productsForPicker } from '@/lib/product-picker'
import { cn } from '@/lib/utils'
import { sr } from '@/lib/ui-copy'

const baseStockOutSchema = z.object({
  productId: z.string().min(1, 'Izaberite proizvod'),
  quantity: z.coerce.number().int().positive('Količina mora biti pozitivan broj'),
  reason: z.string().min(1, 'Unesite razlog').max(200, 'Razlog je predugačak'),
})

type StockOutFormData = z.infer<typeof baseStockOutSchema>

interface StockOutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onSubmit: (data: StockOutFormData) => Promise<void>
  isLoading?: boolean
}

export function StockOutForm({
  open,
  onOpenChange,
  products,
  onSubmit,
  isLoading = false,
}: StockOutFormProps) {
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const pickerProducts = useMemo(() => productsForPicker(products), [products])

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return pickerProducts
    const query = searchQuery.toLowerCase()
    return pickerProducts.filter(
      (p) => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
    )
  }, [pickerProducts, searchQuery])

  const dynamicSchema = useMemo(() => {
    return baseStockOutSchema.refine(
      (data) => {
        if (!data.productId) return true
        const product = pickerProductForId(products, data.productId)
        if (!product) return true

        const availableStock = product.quantity || 0
        return data.quantity <= availableStock
      },
      (data) => {
        const product = pickerProductForId(products, data.productId)
        const availableStock = product?.quantity || 0

        return {
          message: `Ne može se skinuti više od stanja (${availableStock} kom).`,
          path: ['quantity'],
        }
      }
    )
  }, [products])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<StockOutFormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      reason: '',
    },
  })

  const selectedProductId = watch('productId')
  const selectedProduct = pickerProductForId(products, selectedProductId)
  const availableStock = selectedProduct?.quantity || 0

  const handleFormSubmit = async (data: StockOutFormData) => {
    await onSubmit(data)
    if (!isLoading) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Izlaz robe</DialogTitle>
          <DialogDescription>
            Uklonite količinu sa stanja. Ovo smanjuje količinu proizvoda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="productId">
                Proizvod <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    setProductSearchOpen(!productSearchOpen)
                    if (!productSearchOpen) {
                      setSearchQuery('')
                    }
                  }}
                  className="justify-between w-full font-normal"
                >
                  <span className="truncate">
                    {selectedProduct
                      ? `${selectedProduct.name} (${selectedProduct.sku})`
                      : 'Izaberite proizvod'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {productSearchOpen && (
                  <div
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md"
                    style={{ maxHeight: '300px', overflow: 'hidden' }}
                  >
                    <div className="p-2 border-b">
                      <Input
                        type="text"
                        placeholder="Pretraži proizvode..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="h-9"
                        autoFocus
                      />
                    </div>

                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: '250px' }}
                    >
                      {filteredProducts.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Nema proizvoda.
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <div
                            key={product.sku}
                            onClick={() => {
                              setValue('productId', product.id, { shouldValidate: true })
                              setValue('quantity', 1)
                              setProductSearchOpen(false)
                              setSearchQuery('')
                            }}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                              selectedProduct?.sku === product.sku && "bg-accent"
                            )}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProduct?.sku === product.sku ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Šifra: {product.sku} • Stanje: {product.quantity || 0}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {productSearchOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      setProductSearchOpen(false)
                      setSearchQuery('')
                    }}
                  />
                )}
              </div>
              {errors.productId && (
                <p className="text-sm text-destructive">{errors.productId.message}</p>
              )}
              {selectedProduct && (
                <Badge
                  variant={availableStock === 0 ? 'destructive' : availableStock <= 10 ? 'outline' : 'outline'}
                  className={availableStock === 0 ? '' : availableStock <= 10 ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' : 'border-green-500 text-green-700 dark:text-green-400'}
                >
                  Na stanju: {availableStock} kom
                </Badge>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">
                Količina <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableStock || undefined}
                step="1"
                placeholder="Unesite količinu"
                disabled={availableStock === 0}
                {...register('quantity')}
              />
              {selectedProduct && availableStock === 0 && (
                <p className="text-sm text-destructive">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  Nema na stanju. Izlaz nije moguć.
                </p>
              )}
              {selectedProduct && availableStock > 0 && (
                <p className="text-xs text-muted-foreground">
                  Maksimum za izlaz: <strong>{availableStock}</strong> kom
                </p>
              )}
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">
                Razlog / napomena <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reason"
                placeholder="npr. Prodaja, oštećenje, gubitak, uzorak"
                {...register('reason')}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {sr.common.cancel}
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Evidentiraj izlaz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
