import { formatRsd } from '@/lib/invoice-finance'
import { formatPercent } from '@/lib/sr-format'

/**
 * Hint under the prices in ProductForm (ROADMAP A9.16). Prices are without PDV (the sale price prefills
 * invoice lines, which are without PDV). Margin is on the sale price, like "Marža" on Finansije; the markup
 * on the purchase price is shown too because many owners price that way. Null until both prices are usable.
 */
export function productMarginHint(price: unknown, costPrice: unknown): { text: string; negative: boolean } | null {
  const sale = Number(price)
  const cost = Number(costPrice)
  if (!Number.isFinite(sale) || !Number.isFinite(cost) || sale <= 0 || cost < 0) return null
  if (price === '' || costPrice === '' || costPrice === null || costPrice === undefined) return null
  const difference = Math.round((sale - cost) * 100) / 100
  const margin = (difference / sale) * 100
  const markup = cost > 0 ? ` · na nabavnu ${difference >= 0 ? '+' : ''}${formatPercent((difference / cost) * 100)}` : ''
  return {
    text: `Razlika ${formatRsd(difference)} · marža ${formatPercent(margin)}${markup}`,
    negative: difference < 0,
  }
}
