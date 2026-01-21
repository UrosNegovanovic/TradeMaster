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
import { ProductActionToast } from './ProductActionToast'
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
    getValues,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? product?.name ?? '',
      sku: initialData?.sku ?? product?.sku ?? '',
      price: initialData?.price ?? (product?.price ? Number(product.price) : 0),
      quantity: initialData?.quantity ?? product?.quantity ?? 1,
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
        quantity: initialData?.quantity ?? product?.quantity ?? 1,
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

    // ✅ CLOSE SCANNER IMMEDIATELY (UX Improvement!)
    setScannerOpen(false)

    // ✅ SMART QUANTITY INCREMENT LOGIC (Warehouse Mode)
    const currentSku = getValues('sku')
    const currentQuantity = getValues('quantity') || 0
    
    // Check if this is the same barcode being scanned again
    if (currentSku === barcode && currentSku !== '') {
      // Same item scanned again - increment quantity
      const newQuantity = currentQuantity + 1
      setValue('quantity', newQuantity, { shouldValidate: true })
      
      // Show quantity increment toast
      toast.custom((id) => (
        <ProductActionToast
          variant="scan"
          product={{
            name: currentName || 'Current Product',
            sku: barcode,
            imageUrl: currentImageUrl,
          }}
          onDismiss={() => toast.dismiss(id)}
        />
      ), {
        duration: 2000,
      })
      
      // Show additional success message
      toast.success(`Quantity updated to ${newQuantity}`, {
        description: `Scanned ${barcode} again`,
        duration: 2000,
      })
      
      return // Exit early - no need to fetch metadata again
    }

    // Different barcode - set new SKU and reset quantity to 1
    setValue('sku', barcode, { shouldValidate: true })
    setValue('quantity', 1, { shouldValidate: true })

    // ✅ INSTANT PRODUCT LOOKUP: Check if we already have this product in our database
    setIsFetchingMetadata(true)
    
    try {
      const lookupResponse = await fetch(`/api/products/lookup?sku=${encodeURIComponent(barcode)}`)
      
      if (lookupResponse.ok) {
        const lookupData = await lookupResponse.json()
        
        if (lookupData.found && lookupData.product) {
          // ✅ PRODUCT FOUND IN OUR DATABASE: Auto-fill form
          const existingProduct = lookupData.product
          
          setValue('name', existingProduct.name, { shouldValidate: true })
          setValue('price', Number(existingProduct.price), { shouldValidate: true })
          setValue('quantity', 1, { shouldValidate: true }) // Reset to 1 for new scan
          
          if (existingProduct.imageUrl) {
            setValue('imageUrl', existingProduct.imageUrl, { shouldValidate: true })
          }
          
          if (existingProduct.description) {
            setValue('description', existingProduct.description, { shouldValidate: true })
          }
          
          if (existingProduct.categoryId) {
            setValue('categoryId', existingProduct.categoryId, { shouldValidate: true })
          }
          
          // Show rich toast (contains all context needed)
          toast.custom((id) => (
            <ProductActionToast
              variant="scan"
              product={{
                name: existingProduct.name,
                sku: barcode,
                imageUrl: existingProduct.imageUrl,
              }}
              onDismiss={() => toast.dismiss(id)}
            />
          ), {
            duration: 3000,
          })
          
          setIsFetchingMetadata(false)
          return // Exit early - product found in database
        }
      }
    } catch (error) {
      console.error('Error looking up product in database:', error)
      // Continue to OpenFoodFacts lookup if database lookup fails
    }

    // ✅ PRODUCT NOT IN DATABASE: Try OpenFoodFacts lookup
    // Fetch product metadata from OpenFoodFacts
    
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
        
        // Show rich toast for scanned product
        toast.custom((id) => (
          <ProductActionToast
            variant="scan"
            product={{
              name: metadata.name,
              sku: barcode,
              imageUrl: metadata.imageUrl,
            }}
            onDismiss={() => toast.dismiss(id)}
          />
        ), {
          duration: 4000,
        })
      } else {
        // Show rich toast for scanned product (not found in database)
        toast.custom((id) => (
          <ProductActionToast
            variant="scan"
            product={{
              name: 'Unknown Product',
              sku: barcode,
            }}
            onDismiss={() => toast.dismiss(id)}
          />
        ), {
          duration: 4000,
        })
        
        toast.info('Product not found', {
          description: 'Searched 4 databases (food, beauty, household, global). SKU saved - enter details manually.',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error fetching product metadata:', error)
      
      // Show rich toast for error case
      toast.custom((id) => (
        <ProductActionToast
          variant="scan"
          product={{
            name: 'Unknown Product',
            sku: barcode,
          }}
          onDismiss={() => toast.dismiss(id)}
        />
      ), {
        duration: 3000,
      })
      
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
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Tip: Scan the same barcode multiple times to auto-increment
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">
                Price (Optional - can be added later)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00 (leave empty for quick intake)"
                {...register('price', { valueAsNumber: true, setValueAs: v => v === '' ? 0 : v })}
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
