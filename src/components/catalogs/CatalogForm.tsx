'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { catalogSchema, type CatalogFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductPicker } from './ProductPicker'
import { Product } from '@/types/product'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { sr } from '@/lib/ui-copy'
import { formatRsd } from '@/lib/invoice-finance'

interface CatalogFormProps {
  products: Product[]
  onSubmit: (data: CatalogFormData) => Promise<void>
  isLoading?: boolean
  initialData?: {
    name?: string
    clientName?: string | null
    discount?: number
    notes?: string | null
    productIds?: string[]
  }
}

export function CatalogForm({
  products,
  onSubmit,
  isLoading = false,
  initialData,
}: CatalogFormProps) {
  // Get initial productIds - use empty array if not provided
  const initialProductIds = initialData?.productIds || []

  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>(
    initialProductIds
  )

  // Track previous initialProductIds to detect actual changes
  const prevInitialProductIdsRef = React.useRef<string>(
    JSON.stringify(initialProductIds)
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      name: initialData?.name || '',
      clientName: initialData?.clientName || '',
      discount: initialData?.discount || 0,
      notes: initialData?.notes || '',
      productIds: initialProductIds,
    },
  })

  const discount = watch('discount')

  // Track previous selectedProductIds to prevent unnecessary setValue calls
  const prevSelectedProductIdsRef = React.useRef<string>(
    JSON.stringify(selectedProductIds)
  )

  // Memoize the selection change handler to prevent unnecessary re-renders
  const handleSelectionChange = React.useCallback(
    (productIds: string[]) => {
      setSelectedProductIds(productIds)
    },
    []
  )

  // Update form value when selected products change (only if actually changed)
  React.useEffect(() => {
    const currentIds = JSON.stringify(selectedProductIds.sort())
    const prevIds = prevSelectedProductIdsRef.current
    if (currentIds !== prevIds) {
      setValue('productIds', selectedProductIds, { shouldValidate: true })
      prevSelectedProductIdsRef.current = currentIds
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductIds])

  // Sync selected products when initialData.productIds changes (for edit mode)
  React.useEffect(() => {
    const currentInitialIds = JSON.stringify(initialProductIds.sort())
    // Only update if the initial productIds actually changed
    if (currentInitialIds !== prevInitialProductIdsRef.current) {
      setSelectedProductIds(initialProductIds)
      prevInitialProductIdsRef.current = currentInitialIds
      prevSelectedProductIdsRef.current = currentInitialIds
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.productIds]) // Depend on the actual source, not the derived value

  const handleFormSubmit = async (data: CatalogFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{sr.catalog.information}</CardTitle>
          <CardDescription>
            {sr.catalog.informationDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {sr.catalog.name} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={sr.catalog.namePlaceholder}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">{sr.catalog.clientName}</Label>
              <Input
                id="clientName"
                placeholder={sr.catalog.clientNamePlaceholder}
                {...register('clientName')}
              />
              {errors.clientName && (
                <p className="text-sm text-destructive">
                  {errors.clientName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">
                {sr.catalog.discount} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                {...register('discount', { valueAsNumber: true })}
              />
              {errors.discount && (
                <p className="text-sm text-destructive">
                  {errors.discount.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{sr.catalog.notes}</Label>
            <Input
              id="notes"
              placeholder={sr.catalog.notesPlaceholder}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{sr.catalog.selectProducts}</CardTitle>
          <CardDescription>
            {sr.catalog.selectProductsDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductPicker
            products={products}
            selectedProductIds={selectedProductIds}
            onSelectionChange={handleSelectionChange}
          />
          {errors.productIds && (
            <p className="text-sm text-destructive mt-2">
              {errors.productIds.message}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedProductIds.length > 0 && discount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{sr.catalog.pricePreview}</CardTitle>
            <CardDescription>
              {sr.catalog.pricePreviewDescription(discount)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedProductIds.map((productId) => {
                const product = products.find((p) => p.id === productId)
                if (!product) return null

                const originalPrice = Number(product.price)
                const discountedPrice = originalPrice * (1 - discount / 100)

                return (
                  <div
                    key={productId}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm line-through text-muted-foreground">
                        {formatRsd(originalPrice)}
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {formatRsd(discountedPrice)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? sr.catalog.update : sr.catalog.create}
        </Button>
      </div>
    </form>
  )
}
