'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, ScanBarcode } from 'lucide-react'
import { Product } from '@/types/product'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { BarcodeScanner } from './BarcodeScanner'
import { CategorySelect } from './CategorySelect'
import { fetchProductMetadata, isValidBarcode } from '@/lib/openfoodfacts'
import { toast } from 'sonner'

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProductFormData) => Promise<void>
  product?: Product | null
  isLoading?: boolean
  initialData?: Partial<ProductFormData> | null
}

export function ProductForm({
  open,
  onOpenChange,
  onSubmit,
  product,
  isLoading = false,
  initialData = null,
}: ProductFormProps) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? product?.name ?? '',
      sku: initialData?.sku ?? product?.sku ?? '',
      price: initialData?.price ?? (product?.price ? Number(product.price) : 0),
      description: initialData?.description ?? product?.description ?? '',
      imageUrl: initialData?.imageUrl ?? product?.imageUrl ?? '',
      categoryId: product?.categoryId ?? null,
    },
  })

  // Watch current form values
  const currentName = watch('name')
  const currentDescription = watch('description')
  const currentImageUrl = watch('imageUrl')

  // Reset form when product or initialData changes or dialog opens/closes
  React.useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name ?? product?.name ?? '',
        sku: initialData?.sku ?? product?.sku ?? '',
        price: initialData?.price ?? (product?.price ? Number(product.price) : 0),
        description: initialData?.description ?? product?.description ?? '',
        imageUrl: initialData?.imageUrl ?? product?.imageUrl ?? '',
        categoryId: product?.categoryId ?? null,
      })
    }
  }, [product, initialData, open, reset])

  const handleFormSubmit = async (data: ProductFormData) => {
    await onSubmit(data)
    if (!isLoading) {
      reset()
      onOpenChange(false)
    }
  }

  // Handle barcode scan success
  const handleScanSuccess = async (barcode: string) => {
    // Validate barcode format
    if (!isValidBarcode(barcode)) {
      toast.error('Invalid barcode', {
        description: 'The scanned barcode is too short or invalid. Please try again.',
      })
      return
    }

    // Set SKU immediately
    setValue('sku', barcode, { shouldValidate: true })
    toast.success('Barcode scanned', {
      description: `SKU: ${barcode}`,
    })

    // Fetch product metadata from OpenFoodFacts
    setIsFetchingMetadata(true)
    
    try {
      const metadata = await fetchProductMetadata(barcode)
      
      if (metadata && metadata.found) {
        // Auto-fill name if empty
        if (!currentName && metadata.name) {
          setValue('name', metadata.name, { shouldValidate: true })
        }
        
        // Auto-fill description if empty
        if (!currentDescription && metadata.description) {
          setValue('description', metadata.description, { shouldValidate: true })
        }
        
        // Auto-fill image if empty
        if (!currentImageUrl && metadata.imageUrl) {
          setValue('imageUrl', metadata.imageUrl, { shouldValidate: true })
        }
        
        // Show success message with source indication
        const sourceLabels = {
          food: '🍫 Food Database',
          beauty: '💄 Beauty Database',
          products: '🧴 Products Database',
        }
        const sourceLabel = metadata.source ? sourceLabels[metadata.source] : 'Database'
        
        toast.success('Product found!', {
          description: `${metadata.name} (${sourceLabel})`,
          duration: 4000,
        })
      } else {
        toast.info('Product not found', {
          description: 'Searched 4 databases (food, beauty, household, global). SKU saved - enter details manually.',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error fetching product metadata:', error)
      toast.error('Failed to fetch product info', {
        description: 'Please enter product details manually.',
      })
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product
              ? 'Update the product information below.'
              : 'Add a new product to your inventory. All fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="grid gap-4 py-4 px-6 overflow-y-auto flex-1">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter product name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">
                SKU <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  placeholder="Enter SKU or scan barcode"
                  className="flex-1"
                  {...register('sku')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScannerOpen(true)}
                  title="Scan Barcode"
                  disabled={isFetchingMetadata}
                >
                  {isFetchingMetadata ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanBarcode className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.sku && (
                <p className="text-sm text-destructive">{errors.sku.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter product description (optional)"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <CategorySelect
              value={watch('categoryId') ?? null}
              onChange={(value) => setValue('categoryId', value)}
            />

            <div className="grid gap-2">
              <ImageUpload
                value={watch('imageUrl')}
                onChange={(url) => setValue('imageUrl', url || '')}
                bucket="product-images"
                label="Product Image"
                description="Upload a product image. Maximum file size: 5MB"
              />
              {errors.imageUrl && (
                <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0">
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
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </Dialog>
  )
}
