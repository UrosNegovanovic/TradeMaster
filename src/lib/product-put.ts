import { productCostWriteFields } from '@/lib/product-cost'
import type { ProductFormData } from '@/lib/validations'

/** True when the raw PUT body actually sent a quantity (the schema defaults a missing one to 1). */
export function bodyHasQuantity(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'quantity' in body && (body as { quantity?: unknown }).quantity !== undefined
}

/**
 * Fields for PUT /api/products/[id]. Purchase price is required on this path and clears the zero-reason when > 0.
 * Stock is written only when the request sent a quantity, so an edit without one never resets stock to 1.
 */
export function productPutFields(validated: ProductFormData, options: { quantityProvided?: boolean } = {}) {
  const { quantityProvided = true } = options
  return {
    name: validated.name,
    sku: validated.sku,
    price: validated.price,
    ...productCostWriteFields(validated),
    ...(quantityProvided ? { quantity: validated.quantity } : {}),
    ...(validated.minStock !== undefined ? { minStock: validated.minStock } : {}),
    description: validated.description === '' ? null : validated.description ?? null,
    categoryId: validated.categoryId ?? null,
  }
}
