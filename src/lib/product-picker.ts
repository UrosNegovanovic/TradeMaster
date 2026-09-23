import { stockBySku } from '@/lib/invoice-line'

export type PickerProduct = {
  id: string
  sku: string
  quantity: number
  createdAt: Date | string
}

/**
 * One row per SKU for stock-out / invoice pickers.
 * Quantity is the same live total Magacin sums across daily batches.
 * Identity (id, name, price) stays on the newest row — no product merge/delete.
 */
export function productsForPicker<T extends PickerProduct>(products: T[]): T[] {
  const totals = stockBySku(products)
  const newestBySku = new Map<string, T>()

  for (const product of products) {
    const existing = newestBySku.get(product.sku)
    if (!existing || isNewerProduct(product, existing)) {
      newestBySku.set(product.sku, product)
    }
  }

  return Array.from(newestBySku.values()).map((product) => ({
    ...product,
    quantity: totals.get(product.sku) ?? product.quantity,
  }))
}

export function pickerProductForId<T extends PickerProduct>(
  products: T[],
  productId: string | null | undefined
): T | undefined {
  if (!productId) return undefined
  const pickerProducts = productsForPicker(products)
  const exact = pickerProducts.find((product) => product.id === productId)
  if (exact) return exact
  const raw = products.find((product) => product.id === productId)
  if (!raw) return undefined
  return pickerProducts.find((product) => product.sku === raw.sku)
}

function isNewerProduct(candidate: PickerProduct, current: PickerProduct) {
  const candidateTime = new Date(candidate.createdAt).getTime()
  const currentTime = new Date(current.createdAt).getTime()
  return candidateTime > currentTime || (candidateTime === currentTime && candidate.id > current.id)
}
