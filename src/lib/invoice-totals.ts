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
