'use client'

import { useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Product } from '@/types/product'

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
          message: `Cannot remove more than available stock (${availableStock}). Current inventory: ${availableStock} units.`,
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
              <Select
                value={selectedProductId}
                onValueChange={(value) => {
                  setValue('productId', value, { shouldValidate: true })
                  setValue('quantity', 1) // Reset quantity when product changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stock: {product.quantity || 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-destructive">{errors.productId.message}</p>
              )}
              {selectedProduct && (
                <Badge 
                  variant={availableStock === 0 ? 'destructive' : availableStock <= 10 ? 'outline' : 'outline'}
                  className={availableStock === 0 ? '' : availableStock <= 10 ? 'border-yellow-500 text-yellow-700' : 'border-green-500 text-green-700'}
                >
                  Available Stock: {availableStock} units
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
                  Maximum removable: <strong>{availableStock}</strong> units
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
