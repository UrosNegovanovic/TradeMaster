import type { ProductFormData } from '@/lib/validations'

/** Fields for PUT /api/products/[id]. Omit costPrice when the client did not send it so we do not wipe Magacin costs. */
export function productPutFields(validated: ProductFormData) {
  return {
    name: validated.name,
    sku: validated.sku,
    price: validated.price,
    ...(validated.costPrice !== undefined ? { costPrice: validated.costPrice } : {}),
    quantity: validated.quantity ?? 1,
    description: validated.description === '' ? null : validated.description ?? null,
    categoryId: validated.categoryId ?? null,
  }
}
