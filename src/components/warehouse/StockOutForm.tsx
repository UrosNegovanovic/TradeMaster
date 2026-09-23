'use client'

import * as React from 'react'
import { useMemo, useState, useEffect } from 'react'
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
// Removed Popover and Command - using native dropdown instead
import { Loader2, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react'
import { Product } from '@/types/product'
import { cn } from '@/lib/utils'

// Base schema - we'll add dynamic validation
const baseStockOutSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive number'),
  reason: z.string().min(1, 'Please enter a reason').max(200, 'Reason is too long'),
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
  
  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.sku.toLowerCase().includes(query)
    );
  }, [products, searchQuery])

  // Native dropdown - no need for portal fixes anymore!

  // ✅ Dynamic schema with "Prevent Negative Stock" policy - defined once
  const dynamicSchema = useMemo(() => {
    return baseStockOutSchema.refine(
      (data) => {
        if (!data.productId) return true // Will be caught by base validation
        const product = products.find((p) => p.id === data.productId)
        if (!product) return true
        
        const availableStock = product.quantity || 0
        
        // ✅ PREVENT NEGATIVE STOCK: Cannot remove more than available
        return data.quantity <= availableStock
      },
      (data) => {
        // Dynamic error message based on current product
        const product = products.find((p) => p.id === data.productId)
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

  // ✅ Now watch is available - use it after useForm
  const selectedProductId = watch('productId')
  const selectedProduct = products.find((p) => p.id === selectedProductId)
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
          <DialogTitle>🔴 Register Stock Out</DialogTitle>
          <DialogDescription>
            Remove stock from inventory. This will decrease the product quantity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="productId">
                Product <span className="text-destructive">*</span>
              </Label>
              {/* NATIVE DROPDOWN - No Radix, No cmdk */}
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
                      : "Select a product..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                
                {productSearchOpen && (
                  <div 
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md"
                    style={{ maxHeight: '300px', overflow: 'hidden' }}
                  >
                    {/* Search Input */}
                    <div className="p-2 border-b">
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="h-9"
                        autoFocus
                      />
                    </div>
                    
                    {/* Product List */}
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
                            key={product.id}
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                              setValue('productId', product.id, { shouldValidate: true })
                              setValue('quantity', 1)
                              setProductSearchOpen(false)
                              setSearchQuery('')
                            }}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                              selectedProductId === product.id && "bg-accent"
                            )}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                SKU: {product.sku} • Stock: {product.quantity || 0}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* Backdrop to close dropdown */}
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
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableStock || undefined}
                step="1"
                placeholder="Enter quantity"
                disabled={availableStock === 0}
                {...register('quantity')}
              />
              {selectedProduct && availableStock === 0 && (
                <p className="text-sm text-destructive">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  Out of stock! Cannot register stock out.
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
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reason"
                placeholder="e.g., Sale, Damaged, Lost, Sample"
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
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Stock Out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
