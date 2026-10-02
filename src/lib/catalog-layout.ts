/** How a catalog is laid out in the PDF, the owner preview and the public share page. */

export const CATALOG_LAYOUTS = ['GRID_4', 'GRID_12', 'LIST'] as const
export type CatalogLayout = (typeof CATALOG_LAYOUTS)[number]

export const CATALOG_SORT_MODES = ['MANUAL', 'NAME', 'PRICE_ASC', 'PRICE_DESC'] as const
export type CatalogSortMode = (typeof CATALOG_SORT_MODES)[number]

export type CatalogDisplaySettings = {
  layout: CatalogLayout
  groupByCategory: boolean
  sortMode: CatalogSortMode
  showSku: boolean
  showDescription: boolean
  showOriginalPrice: boolean
}

export const DEFAULT_CATALOG_DISPLAY: CatalogDisplaySettings = {
  layout: 'GRID_4',
  groupByCategory: false,
  sortMode: 'MANUAL',
  showSku: true,
  showDescription: true,
  showOriginalPrice: true,
}

export const CATALOG_LAYOUT_LABELS: Record<CatalogLayout, string> = {
  GRID_4: 'Mreža, 4 po strani (velike slike)',
  GRID_12: 'Mreža, 12 po strani (kompaktno)',
  LIST: 'Lista (cenovnik)',
}

export const CATALOG_SORT_LABELS: Record<CatalogSortMode, string> = {
  MANUAL: 'Ručno (redosled izbora)',
  NAME: 'Po nazivu (A–Ž)',
  PRICE_ASC: 'Po ceni, od najniže',
  PRICE_DESC: 'Po ceni, od najviše',
}

export const UNCATEGORIZED_LABEL = 'Ostalo'

/** Reads stored settings, falling back to defaults for rows or payloads that predate them. */
export function readCatalogDisplay(raw: Partial<Record<keyof CatalogDisplaySettings, unknown>> | null | undefined): CatalogDisplaySettings {
  const value = raw ?? {}
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
    layout: (CATALOG_LAYOUTS as readonly unknown[]).includes(value.layout)
      ? (value.layout as CatalogLayout)
      : DEFAULT_CATALOG_DISPLAY.layout,
    sortMode: (CATALOG_SORT_MODES as readonly unknown[]).includes(value.sortMode)
      ? (value.sortMode as CatalogSortMode)
      : DEFAULT_CATALOG_DISPLAY.sortMode,
    groupByCategory: bool(value.groupByCategory, DEFAULT_CATALOG_DISPLAY.groupByCategory),
    showSku: bool(value.showSku, DEFAULT_CATALOG_DISPLAY.showSku),
    showDescription: bool(value.showDescription, DEFAULT_CATALOG_DISPLAY.showDescription),
    showOriginalPrice: bool(value.showOriginalPrice, DEFAULT_CATALOG_DISPLAY.showOriginalPrice),
  }
}

/** A product without a sale price is stored with price 0; show "Cena na upit" instead of 0,00 RSD. */
export function hasCatalogPrice(price: unknown): boolean {
  const n = Number(price)
  return Number.isFinite(n) && n > 0
}

export type ArrangeableItem = {
  sortOrder?: number
  discountedPrice: unknown
  product: { name: string } | null | undefined
}

export type CatalogSection<T> = {
  /** Category name, or null when the catalog is not grouped. Uncategorized items use UNCATEGORIZED_LABEL. */
  category: string | null
  items: T[]
}

const collator = new Intl.Collator('sr-Latn', { sensitivity: 'base', numeric: true })

function compareItems<T extends ArrangeableItem>(a: T, b: T, sortMode: CatalogSortMode): number {
  const manual = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  if (sortMode === 'MANUAL') return manual
  if (sortMode === 'NAME') {
    return collator.compare(a.product?.name ?? '', b.product?.name ?? '') || manual
  }
  // Price sorts: items "on request" (no price) always go last.
  const aHas = hasCatalogPrice(a.discountedPrice)
  const bHas = hasCatalogPrice(b.discountedPrice)
  if (aHas !== bHas) return aHas ? -1 : 1
  const diff = Number(a.discountedPrice) - Number(b.discountedPrice)
  return (sortMode === 'PRICE_ASC' ? diff : -diff) || manual
}

/**
 * Orders catalog items and optionally splits them into category sections.
 * Sections are sorted by category name; items without a category come last as "Ostalo".
 */
export function arrangeCatalogItems<T extends ArrangeableItem>(
  items: readonly T[],
  settings: Pick<CatalogDisplaySettings, 'sortMode' | 'groupByCategory'>,
  categoryOf: (item: T) => string | null | undefined
): CatalogSection<T>[] {
  const visible = items.filter((item) => item.product)
  const sorted = [...visible].sort((a, b) => compareItems(a, b, settings.sortMode))
  if (!settings.groupByCategory) {
    return sorted.length > 0 ? [{ category: null, items: sorted }] : []
  }

  const byCategory = new Map<string | null, T[]>()
  for (const item of sorted) {
    const name = categoryOf(item)?.trim() || null
    const bucket = byCategory.get(name)
    if (bucket) bucket.push(item)
    else byCategory.set(name, [item])
  }

  return Array.from(byCategory.entries())
    .sort(([a], [b]) => {
      if (a === null) return 1
      if (b === null) return -1
      return collator.compare(a, b)
    })
    .map(([name, sectionItems]) => ({ category: name ?? UNCATEGORIZED_LABEL, items: sectionItems }))
}

/** Splits sections into one page's worth of items, keeping section headers for the items on that page. */
export function paginateSections<T>(
  sections: readonly CatalogSection<T>[],
  page: number,
  perPage: number | 'all'
): CatalogSection<T>[] {
  if (perPage === 'all') return sections.map((section) => ({ ...section, items: [...section.items] }))
  const start = (Math.max(1, page) - 1) * perPage
  const end = start + perPage
  const result: CatalogSection<T>[] = []
  let offset = 0
  for (const section of sections) {
    const sectionStart = offset
    const sectionEnd = offset + section.items.length
    offset = sectionEnd
    if (sectionEnd <= start || sectionStart >= end) continue
    const slice = section.items.slice(Math.max(0, start - sectionStart), Math.min(section.items.length, end - sectionStart))
    result.push({ category: section.category, items: slice })
  }
  return result
}

/** PDF grid pages: every category starts on a new page so its title sits above its products. */
export function chunkSectionsIntoPages<T>(
  sections: readonly CatalogSection<T>[],
  perPage: number
): CatalogSection<T>[] {
  const pages: CatalogSection<T>[] = []
  for (const section of sections) {
    for (let i = 0; i < section.items.length; i += perPage) {
      pages.push({ category: section.category, items: section.items.slice(i, i + perPage) })
    }
  }
  return pages
}

export function countSectionItems(sections: readonly CatalogSection<unknown>[]): number {
  return sections.reduce((sum, section) => sum + section.items.length, 0)
}

/** Case- and diacritic-insensitive search used on the public share page ("cokolada" finds "Čokolada"). */
export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('sr-Latn')
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function filterCatalogItems<T>(
  items: readonly T[],
  filter: { query: string; category: string | null },
  fields: (item: T) => { text: Array<string | null | undefined>; category: string | null | undefined }
): T[] {
  const query = normalizeSearchText(filter.query)
  return items.filter((item) => {
    const { text, category } = fields(item)
    if (filter.category !== null) {
      const name = category?.trim() || UNCATEGORIZED_LABEL
      if (name !== filter.category) return false
    }
    if (!query) return true
    return text.some((value) => value && normalizeSearchText(value).includes(query))
  })
}

/** Distinct category names present in a catalog, sorted, with "Ostalo" last. */
export function listCatalogCategories<T>(items: readonly T[], categoryOf: (item: T) => string | null | undefined): string[] {
  const names = new Set<string>()
  let hasUncategorized = false
  for (const item of items) {
    const name = categoryOf(item)?.trim()
    if (name) names.add(name)
    else hasUncategorized = true
  }
  const sorted = Array.from(names).sort((a, b) => collator.compare(a, b))
  return hasUncategorized ? [...sorted, UNCATEGORIZED_LABEL] : sorted
}

/** Saves items in the order the user picked them; unknown ids are skipped. */
export function orderBySelection<T extends { id: string }>(records: readonly T[], selectedIds: readonly string[]): T[] {
  const byId = new Map(records.map((record) => [record.id, record]))
  const result: T[] = []
  for (const id of selectedIds) {
    const record = byId.get(id)
    if (record) result.push(record)
  }
  return result
}

/** Moves one id up (-1) or down (+1) in the manual order. */
export function moveId(ids: readonly string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ids.length) return [...ids]
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
