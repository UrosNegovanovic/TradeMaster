export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function clampDiscountPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  if (value > 100) return 100
  return value
}

export function lineSubtotal(quantity: number, unitPrice: number): number {
  const qty = Number.isFinite(quantity) ? quantity : 0
  const price = Number.isFinite(unitPrice) ? unitPrice : 0
  return roundMoney(qty * price)
}

export function lineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number
): number {
  const percent = clampDiscountPercent(discountPercent)
  return roundMoney(lineSubtotal(quantity, unitPrice) * (1 - percent / 100))
}

export function lineDiscountAmount(
  quantity: number,
  unitPrice: number,
  discountPercent: number
): number {
  return roundMoney(
    lineSubtotal(quantity, unitPrice) - lineTotal(quantity, unitPrice, discountPercent)
  )
}

export function stockBySku(
  products: Array<{ sku: string; quantity: number }>
): Map<string, number> {
  const map = new Map<string, number>()
  for (const product of products) {
    map.set(product.sku, (map.get(product.sku) ?? 0) + product.quantity)
  }
  return map
}

export function addReservedStock(
  stock: Map<string, number>,
  reserved: Array<{ sku: string | null; quantity: number }>
): Map<string, number> {
  const next = new Map(stock)
  for (const row of reserved) {
    if (!row.sku) continue
    next.set(row.sku, (next.get(row.sku) ?? 0) + (Number.isFinite(row.quantity) ? row.quantity : 0))
  }
  return next
}

export function remainingStock(options: {
  sku: string | null
  lineId: string
  lines: Array<{ id: string; sku: string | null; quantity: number }>
  stockBySku: Map<string, number>
}): number | null {
  if (!options.sku) return null
  const onHand = options.stockBySku.get(options.sku) ?? 0
  const usedByOthers = options.lines
    .filter((line) => line.id !== options.lineId && line.sku === options.sku)
    .reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? line.quantity : 0), 0)
  return onHand - usedByOthers
}
