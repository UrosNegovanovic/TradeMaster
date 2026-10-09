import { format } from 'date-fns'
import { srLatn } from 'date-fns/locale'

/** Serbian formatting shared by pages and PDFs (ROADMAP A9.6). Client-safe. */

/** "15%", "12,5%", "33,33%": decimal comma, at most 2 decimals, no trailing zeros. */
export function formatPercent(value: number | string | null | undefined): string {
  const number = Number(value ?? 0)
  const safe = Number.isFinite(number) ? number : 0
  return `${new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 2 }).format(safe)}%`
}

/**
 * Serbian noun form after a number: 1, 21, 31… take `one`; 2-4, 22-24… take `few`; the rest
 * (0, 5-20, 25-30…) take `many`. pluralSr(1, 'faktura', 'fakture', 'faktura') → "faktura".
 */
export function pluralSr(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count))
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

/** "1 otvorena faktura", "3 otvorene fakture", "5 otvorenih faktura". */
export function countSr(count: number, one: string, few: string, many: string): string {
  return `${count} ${pluralSr(count, one, few, many)}`
}

/** "10. oktobar 2026." for date filters and pickers (date-fns sr-Latn). */
export function formatLongDateSr(date: Date): string {
  return format(date, 'd. MMMM yyyy.', { locale: srLatn })
}

export { srLatn }
