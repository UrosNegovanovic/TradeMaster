import { productCostWriteFields } from '@/lib/product-cost'
import type { ProductFormData } from '@/lib/validations'

/** Fields for PUT /api/products/[id]. Purchase price is required on this path and clears the zero-reason when > 0. */
export function productPutFields(validated: ProductFormData) {
  return {
    name: validated.name,
    sku: validated.sku,
    price: validated.price,
    ...productCostWriteFields(validated),
    quantity: validated.quantity ?? 1,
    description: validated.description === '' ? null : validated.description ?? null,
    categoryId: validated.categoryId ?? null,
  }
}
