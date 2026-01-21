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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, ScanBarcode } from 'lucide-react'
import { Product } from '@/types/product'

// Base schema - we'll add dynamic validation
const baseStockInSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive number'),
  reason: z.string().min(1, 'Please enter a reason').max(200, 'Reason is too long'),
})

type StockInFormData = z.infer<typeof baseStockInSchema>

interface StockInFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onSubmit: (data: StockInFormData) => Promise<void>
  isLoading?: boolean
}

export function StockInForm({
  open,
  onOpenChange,
  products,
  onSubmit,
  isLoading = false,
}: StockInFormProps) {
  // ✅ Dynamic schema with "Scanner First" policy - defined once
  const dynamicSchema = useMemo(() => {
    return baseStockInSchema.refine(
      (data) => {
        if (!data.productId) return true // Will be caught by base validation
        const product = products.find((p) => p.id === data.productId)
        if (!product) return true
        
        const maxAllowed = product.quantity || 0
        
        // ✅ SCANNER FIRST POLICY: Cannot manually add more than current stock
        return data.quantity <= maxAllowed
      },
      (data) => {
        // Dynamic error message based on current product
        const product = products.find((p) => p.id === data.productId)
        const maxAllowed = product?.quantity || 0
        
        return {
          message: `Manual limit exceeded. Cannot add more than current stock (${maxAllowed}). Use Inventory Scanner for large additions.`,
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
  } = useForm<StockInFormData>({
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
  const maxAllowed = selectedProduct?.quantity || 0

  const handleFormSubmit = async (data: StockInFormData) => {
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
          <DialogTitle>🟢 Register Stock In</DialogTitle>
          <DialogDescription>
            Add stock to inventory. This will increase the product quantity.
          </DialogDescription>
        </DialogHeader>
        
        {/* Scanner First Policy Warning */}
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <ScanBarcode className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Scanner First Policy:</strong> Manual additions are limited to current stock level. 
            For large stock increases, use the Inventory Scanner.
          </AlertDescription>
        </Alert>

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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Current Stock: {selectedProduct.quantity || 0} units
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950 border-yellow-500">
                    Manual Limit: {maxAllowed} max
                  </Badge>
                </div>
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
                max={maxAllowed || undefined}
                step="1"
                placeholder="Enter quantity"
                {...register('quantity')}
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  Available for manual entry: <strong>{maxAllowed}</strong> units
                </p>
              )}
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">
                Reason / Note <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reason"
                placeholder="e.g., Purchase from supplier, Return from customer"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Stock In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
