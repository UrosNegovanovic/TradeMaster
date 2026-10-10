import { stockBySku } from '@/lib/invoice-line'

/**
 * Asortiman "what needs completing" filters and sorting (ROADMAP A9.14). Client-side, on the rows the
 * page already has. Stock is per SKU (summed daily batches, like Magacin), so "Nizak lager" and the stock
 * sort agree with Magacin and the dashboard.
 */
export const INVENTORY_FILTERS = ['all', 'missing-cost', 'missing-price', 'low-stock'] as const
export type InventoryFilter = (typeof INVENTORY_FILTERS)[number]

export const INVENTORY_SORTS = ['newest', 'name', 'stock-asc', 'stock-desc', 'price-desc'] as const
export type InventorySort = (typeof INVENTORY_SORTS)[number]

export const INVENTORY_FILTER_LABELS: Record<InventoryFilter, string> = {
  all: 'Svi',
  'missing-cost': 'Bez nabavne cene',
  'missing-price': 'Bez prodajne cene',
  'low-stock': 'Nizak lager',
}

export const INVENTORY_SORT_LABELS: Record<InventorySort, string> = {
  newest: 'Najnoviji prvo',
  name: 'Naziv A-Š',
  'stock-asc': 'Najmanje na stanju',
  'stock-desc': 'Najviše na stanju',
  'price-desc': 'Najveća prodajna cena',
}

type Money = number | string | { toString(): string } | null | undefined

export type InventoryRow = {
  sku: string
  name: string
  quantity: number
  minStock?: number | null
  price: Money
  costPrice?: Money
  createdAt: Date | string
}

const amount = (value: Money): number | null => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value.toString())
  return Number.isFinite(number) ? number : null
}

/** A purchase price of 0 is valid (with a reason); only a missing one needs completing. */
export const missingCost = (row: InventoryRow) => amount(row.costPrice) === null
export const missingPrice = (row: InventoryRow) => (amount(row.price) ?? 0) <= 0

export function inventoryFilterCounts<T extends InventoryRow>(rows: T[]): Record<InventoryFilter, number> {
  const totals = stockBySku(rows)
  return {
    all: rows.length,
    'missing-cost': rows.filter(missingCost).length,
    'missing-price': rows.filter(missingPrice).length,
    'low-stock': rows.filter((row) => isLowStock(row, totals)).length,
  }
}

function isLowStock(row: InventoryRow, totals: Map<string, number>): boolean {
  return (totals.get(row.sku) ?? row.quantity) <= (row.minStock ?? 2)
}

export function applyInventoryView<T extends InventoryRow>(
  rows: T[],
  filter: InventoryFilter,
  sort: InventorySort
): T[] {
  const totals = stockBySku(rows)
  const filtered = rows.filter((row) => {
    if (filter === 'missing-cost') return missingCost(row)
    if (filter === 'missing-price') return missingPrice(row)
    if (filter === 'low-stock') return isLowStock(row, totals)
    return true
  })
  if (sort === 'newest') return filtered
  const stock = (row: T) => totals.get(row.sku) ?? row.quantity
  return [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'sr')
    if (sort === 'stock-asc') return stock(a) - stock(b) || a.name.localeCompare(b.name, 'sr')
    if (sort === 'stock-desc') return stock(b) - stock(a) || a.name.localeCompare(b.name, 'sr')
    return (amount(b.price) ?? 0) - (amount(a.price) ?? 0) || a.name.localeCompare(b.name, 'sr')
  })
}

export function parseInventoryFilter(value: string | null): InventoryFilter {
  return (INVENTORY_FILTERS as readonly string[]).includes(value ?? '') ? (value as InventoryFilter) : 'all'
}
