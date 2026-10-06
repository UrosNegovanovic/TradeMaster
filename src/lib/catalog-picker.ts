/** Product selection helpers for the catalog form: multi-category filter, select-all and per-category counts. */

/** Filter value for products without a category ("Ostalo"). Never a real category id. */
export const NO_CATEGORY = '__none__'

export type PickerProduct = {
  id: string
  name: string
  sku: string
  categoryId: string | null
  createdAt: Date | string
}

export type PickerFilter = {
  query: string
  /** Category ids (or NO_CATEGORY). Empty means all categories. */
  categories: readonly string[]
  /** Only products created on this Belgrade day, compared by the caller-supplied predicate. */
  matchesDate?: ((createdAt: Date | string) => boolean) | null
}

function createdAtMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

/**
 * One row per SKU: the newest by createdAt, then id (the same row product intake updates).
 * Legacy daily-batch rows share a SKU; showing all of them puts duplicates in a catalog.
 * Rows in `keepIds` (already in the catalog) always stay, so editing an older catalog loses nothing.
 * Input order is kept.
 */
export function latestPerSku<T extends Pick<PickerProduct, 'id' | 'sku' | 'createdAt'>>(
  products: readonly T[],
  keepIds: readonly string[] = []
): T[] {
  const newest = new Map<string, T>()
  for (const product of products) {
    const current = newest.get(product.sku)
    if (
      !current ||
      createdAtMs(product.createdAt) > createdAtMs(current.createdAt) ||
      (createdAtMs(product.createdAt) === createdAtMs(current.createdAt) && product.id > current.id)
    ) {
      newest.set(product.sku, product)
    }
  }
  const keep = new Set(keepIds)
  return products.filter((product) => keep.has(product.id) || newest.get(product.sku) === product)
}

export function categoryKey(product: Pick<PickerProduct, 'categoryId'>): string {
  return product.categoryId ?? NO_CATEGORY
}

export function filterPickerProducts<T extends PickerProduct>(products: readonly T[], filter: PickerFilter): T[] {
  const query = filter.query.toLowerCase().trim()
  const categories = new Set(filter.categories)
  return products.filter((product) => {
    if (categories.size > 0 && !categories.has(categoryKey(product))) return false
    if (filter.matchesDate && !filter.matchesDate(product.createdAt)) return false
    if (!query) return true
    return product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
  })
}

export function toggleCategory(selected: readonly string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]
}

/** Adds every visible product that is not selected yet, keeping the existing order and then the visible order. */
export function selectAll(selectedIds: readonly string[], visibleIds: readonly string[]): string[] {
  const already = new Set(selectedIds)
  return [...selectedIds, ...visibleIds.filter((id) => !already.has(id))]
}

/** Removes the visible products from the selection (products hidden by a filter stay selected). */
export function deselectAll(selectedIds: readonly string[], visibleIds: readonly string[]): string[] {
  const visible = new Set(visibleIds)
  return selectedIds.filter((id) => !visible.has(id))
}

export type CategoryCount = { key: string; total: number; selected: number }

/** Product and selected counts per category, in first-seen order of the supplied key list. */
export function countByCategory(
  products: readonly Pick<PickerProduct, 'id' | 'categoryId'>[],
  selectedIds: readonly string[],
  keys: readonly string[]
): CategoryCount[] {
  const selected = new Set(selectedIds)
  const counts = new Map<string, CategoryCount>(keys.map((key) => [key, { key, total: 0, selected: 0 }]))
  for (const product of products) {
    const entry = counts.get(categoryKey(product))
    if (!entry) continue
    entry.total += 1
    if (selected.has(product.id)) entry.selected += 1
  }
  return Array.from(counts.values())
}
