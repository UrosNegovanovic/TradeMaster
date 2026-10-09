// Client-safe: no xlsx here. The XLSX/CSV writers are in stock-list-export.ts (server only).
import { formatLocalYmd } from '@/lib/local-date'

type MoneyLike = number | string | { toString(): string } | null | undefined

export type StockListProduct = {
  sku: string
  name: string
  quantity: number
  price: MoneyLike
  costPrice: MoneyLike
  createdAt: Date | string
  category?: { name: string } | null
}

export type StockListRow = {
  sku: string
  name: string
  category: string
  quantity: number
  /** Newest row of the SKU, as Asortiman shows it. */
  costPrice: number | null
  price: number
  /** Sum of row quantity x row purchase price; null when a row with stock has no purchase price yet. */
  costValue: number | null
  saleValue: number
}

export type StockList = {
  rows: StockListRow[]
  totals: { quantity: number; costValue: number; saleValue: number; missingCostCount: number }
}

const money = (value: MoneyLike): number | null => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value.toString())
  return Number.isFinite(number) ? number : null
}
const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * "Lager lista" (ROADMAP A9.19): one row per SKU, like Magacin. Old daily-batch rows of a SKU add their
 * quantity and value (each at its own prices); name and prices shown are the newest row's.
 * Purchase value is never guessed: a SKU whose stock has no purchase price counts in missingCostCount.
 */
export function buildStockList(products: StockListProduct[]): StockList {
  const bySku = new Map<string, StockListProduct[]>()
  for (const product of products) bySku.set(product.sku, [...(bySku.get(product.sku) ?? []), product])

  const rows = [...bySku.values()].map((group): StockListRow => {
    const newest = group.reduce((a, b) => (new Date(b.createdAt) > new Date(a.createdAt) ? b : a))
    const missingCost = group.some((row) => row.quantity > 0 && money(row.costPrice) === null)
    return {
      sku: newest.sku,
      name: newest.name,
      category: newest.category?.name ?? '',
      quantity: group.reduce((sum, row) => sum + row.quantity, 0),
      costPrice: money(newest.costPrice),
      price: money(newest.price) ?? 0,
      costValue: missingCost
        ? null
        : round2(group.reduce((sum, row) => sum + row.quantity * (money(row.costPrice) ?? 0), 0)),
      saleValue: round2(group.reduce((sum, row) => sum + row.quantity * (money(row.price) ?? 0), 0)),
    }
  })
  rows.sort((a, b) => a.name.localeCompare(b.name, 'sr') || a.sku.localeCompare(b.sku))

  return {
    rows,
    totals: {
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      costValue: round2(rows.reduce((sum, row) => sum + (row.costValue ?? 0), 0)),
      saleValue: round2(rows.reduce((sum, row) => sum + row.saleValue, 0)),
      missingCostCount: rows.filter((row) => row.costValue === null).length,
    },
  }
}

export function stockListFilename(ext: 'xlsx' | 'csv', now = new Date()): string {
  return `lager-lista_${formatLocalYmd(now)}.${ext}`
}
