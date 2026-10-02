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
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'
import React from 'react'
import { sr } from '@/lib/ui-copy'
import { formatRsd } from '@/lib/invoice-finance'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CATALOG_LAYOUTS,
  CATALOG_LAYOUT_LABELS,
  CATALOG_SORT_LABELS,
  CATALOG_SORT_MODES,
  moveId,
  readCatalogDisplay,
  type CatalogDisplaySettings,
  type CatalogLayout,
  type CatalogSortMode,
} from '@/lib/catalog-layout'

type DisplayToggle = 'groupByCategory' | 'showSku' | 'showDescription' | 'showOriginalPrice'

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
  } & Partial<CatalogDisplaySettings>
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
      ...readCatalogDisplay(initialData),
    },
  })

  const discount = watch('discount')
  const layout = watch('layout')
  const sortMode = watch('sortMode')
  const toggles: Record<DisplayToggle, boolean> = {
    groupByCategory: watch('groupByCategory'),
    showSku: watch('showSku'),
    showDescription: watch('showDescription'),
    showOriginalPrice: watch('showOriginalPrice'),
  }
  const toggleOptions: Array<{ key: DisplayToggle; label: string; help?: string }> = [
    { key: 'groupByCategory', label: sr.catalog.groupByCategory, help: sr.catalog.groupByCategoryHelp },
    { key: 'showSku', label: sr.catalog.showSku },
    { key: 'showDescription', label: sr.catalog.showDescription },
    { key: 'showOriginalPrice', label: sr.catalog.showOriginalPrice },
  ]

  const renderToggle = ({ key, label, help }: (typeof toggleOptions)[number]) => (
    <div key={key} className="flex items-start gap-3">
      <Checkbox
        id={`catalog-${key}`}
        checked={toggles[key]}
        onCheckedChange={(checked) => setValue(key, checked === true, { shouldDirty: true })}
        className="mt-0.5"
      />
      <div className="grid gap-0.5">
        <Label htmlFor={`catalog-${key}`} className="font-normal">
          {label}
        </Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
    </div>
  )

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
    // Order is the manual catalog order, so compare without sorting
    const currentIds = JSON.stringify(selectedProductIds)
    const prevIds = prevSelectedProductIdsRef.current
    if (currentIds !== prevIds) {
      setValue('productIds', selectedProductIds, { shouldValidate: true })
      prevSelectedProductIdsRef.current = currentIds
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductIds])

  // Sync selected products when initialData.productIds changes (for edit mode)
  React.useEffect(() => {
    const currentInitialIds = JSON.stringify(initialProductIds)
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

      {sortMode === 'MANUAL' && selectedProductIds.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{sr.catalog.manualOrder}</CardTitle>
            <CardDescription>{sr.catalog.manualOrderDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="divide-y rounded-md border">
              {selectedProductIds.map((productId, index) => {
                const product = products.find((p) => p.id === productId)
                if (!product) return null
                return (
                  <li key={productId} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      disabled={index === 0}
                      aria-label={`${sr.catalog.moveUp}: ${product.name}`}
                      onClick={() => setSelectedProductIds((ids) => moveId(ids, productId, -1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      disabled={index === selectedProductIds.length - 1}
                      aria-label={`${sr.catalog.moveDown}: ${product.name}`}
                      onClick={() => setSelectedProductIds((ids) => moveId(ids, productId, 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{sr.catalog.display}</CardTitle>
          <CardDescription>{sr.catalog.displayDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="catalog-layout">{sr.catalog.layout}</Label>
              <Select
                value={layout}
                onValueChange={(value) => setValue('layout', value as CatalogLayout, { shouldDirty: true })}
              >
                <SelectTrigger id="catalog-layout" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_LAYOUTS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CATALOG_LAYOUT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-sort">{sr.catalog.sortMode}</Label>
              <Select
                value={sortMode}
                onValueChange={(value) => setValue('sortMode', value as CatalogSortMode, { shouldDirty: true })}
              >
                <SelectTrigger id="catalog-sort" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_SORT_MODES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CATALOG_SORT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderToggle(toggleOptions[0])}

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">{sr.catalog.visibleFields}</legend>
            {toggleOptions.slice(1).map(renderToggle)}
          </fieldset>
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
