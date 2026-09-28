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
import { optionalCostPriceSchema } from '@/lib/validations'
import { sr } from '@/lib/ui-copy'

const baseStockInSchema = z.object({
  productId: z.string().min(1, 'Izaberite proizvod'),
  quantity: z.coerce.number().int().positive('Količina mora biti pozitivan broj'),
  reason: z.string().min(1, 'Unesite razlog').max(200, 'Razlog je predugačak'),
  costPrice: optionalCostPriceSchema,
})

export type StockInFormData = z.infer<typeof baseStockInSchema>

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
  const dynamicSchema = useMemo(() => {
    return baseStockInSchema.refine(
      (data) => {
        if (!data.productId) return true
        const product = products.find((p) => p.id === data.productId)
        if (!product) return true

        const maxAllowed = product.quantity || 0
        return data.quantity <= maxAllowed
      },
      (data) => {
        const product = products.find((p) => p.id === data.productId)
        const maxAllowed = product?.quantity || 0

        return {
          message: `Ručni limit je prekoračen. Ne možete dodati više od trenutnog stanja (${maxAllowed}). Za veći ulaz koristite skener.`,
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
      costPrice: undefined,
    },
  })

  const selectedProductId = watch('productId')
  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const maxAllowed = selectedProduct?.quantity || 0

  const handleFormSubmit = async (data: StockInFormData) => {
    await onSubmit({
      ...data,
      costPrice:
        data.costPrice === undefined || data.costPrice === null || Number.isNaN(data.costPrice)
          ? undefined
          : data.costPrice,
    })
    if (!isLoading) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ulaz robe</DialogTitle>
          <DialogDescription>
            Dodajte količinu na stanje. Opciona nabavna cena ažurira trenutnu nabavnu cenu proizvoda.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <ScanBarcode className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Prvo skener:</strong> ručni ulaz je ograničen na trenutno stanje. Za veće količine koristite
            skener asortimana.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="productId">
                Proizvod <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => {
                  setValue('productId', value, { shouldValidate: true })
                  setValue('quantity', 1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite proizvod" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stanje: {product.quantity || 0}
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
                    Trenutno stanje: {selectedProduct.quantity || 0} kom
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950 border-yellow-500">
                    Ručni limit: {maxAllowed} max
                  </Badge>
                </div>
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
                max={maxAllowed || undefined}
                step="1"
                placeholder="Unesite količinu"
                {...register('quantity')}
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  Dostupno za ručni unos: <strong>{maxAllowed}</strong> kom
                </p>
              )}
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="costPrice">{sr.product.costPrice} (opciono)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register('costPrice', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
              />
              <p className="text-xs text-muted-foreground">
                {sr.product.costPriceDescription} Ako ostavite prazno, postojeća nabavna cena se ne menja.
              </p>
              {errors.costPrice && (
                <p className="text-sm text-destructive">{errors.costPrice.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">
                Razlog / napomena <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reason"
                placeholder="npr. Nabavka od dobavljača, povrat od kupca"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Evidentiraj ulaz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
