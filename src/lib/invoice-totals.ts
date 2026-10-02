import { Decimal } from '@prisma/client/runtime/library'

export const MONEY_SCALE = 2
export const MONEY_MAX = new Decimal('99999999.99')
export const UNIT_PRICE_MIN = new Decimal('0')
export const DISCOUNT_MIN = new Decimal(0)
export const DISCOUNT_MAX = new Decimal(100)
export const QUANTITY_MIN = 1
export const QUANTITY_MAX = 2147483647

export function roundMoneyHalfUp(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP)
}

export function hasAllowedMoneyScale(value: Decimal): boolean {
  return value.decimalPlaces() <= MONEY_SCALE
}

export function isWithinMoneyRange(value: Decimal): boolean {
  return value.gte(0) && value.lte(MONEY_MAX)
}

export function calculateItemTotal(
  quantity: number,
  unitPrice: Decimal,
  discount: Decimal
): Decimal {
  const raw = new Decimal(quantity)
    .times(unitPrice)
    .times(new Decimal(1).minus(discount.dividedBy(100)))

  return roundMoneyHalfUp(raw)
}

export function sumRoundedItemTotals(itemTotals: Decimal[]): Decimal {
  return itemTotals.reduce((sum, itemTotal) => sum.plus(itemTotal), new Decimal(0))
}

export function uniqueProductIds(
  items: Array<{ productId?: string | null }>
): string[] {
  return [
    ...new Set(
      items
        .map((item) => item.productId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]
}

export const VAT_RATES = [0, 10, 20] as const
export type VatRate = (typeof VAT_RATES)[number]

export function isVatRate(value: unknown): value is VatRate {
  return typeof value === 'number' && (VAT_RATES as readonly number[]).includes(value)
}

export type VatGroup = { rate: VatRate; base: Decimal; vat: Decimal }

export type VatBreakdown = {
  /** Osnovica: sum of line totals (excluding PDV). */
  base: Decimal
  /** PDV per rate, only rates present on the invoice, highest rate first. */
  groups: VatGroup[]
  vat: Decimal
  /** Amount payable: base + vat. */
  total: Decimal
}

/**
 * PDV is calculated per rate on the summed base of that rate and rounded half-up to 2 decimals
 * (not per line), which is how a Serbian invoice shows "osnovica i PDV po stopama".
 * Lines are already rounded, so the base is exact.
 */
export function calculateVatBreakdown(
  lines: Array<{ total: Decimal; vatRate: number }>
): VatBreakdown {
  const bases = new Map<VatRate, Decimal>()
  for (const line of lines) {
    const rate = isVatRate(line.vatRate) ? line.vatRate : 0
    bases.set(rate, (bases.get(rate) ?? new Decimal(0)).plus(line.total))
  }

  const groups = [...bases.entries()]
    .sort(([left], [right]) => right - left)
    .map(([rate, base]) => ({
      rate,
      base,
      vat: roundMoneyHalfUp(base.times(rate).dividedBy(100)),
    }))

  const base = groups.reduce((sum, group) => sum.plus(group.base), new Decimal(0))
  const vat = groups.reduce((sum, group) => sum.plus(group.vat), new Decimal(0))
  return { base, groups, vat, total: base.plus(vat) }
}
