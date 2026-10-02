/**
 * Display-side PDV helpers (numbers, integer cents, no Decimal) for the form, the detail page
 * and the PDF. The server computes the authoritative amounts with `calculateVatBreakdown`
 * in `invoice-totals.ts`; both round PDV half-up per rate group, so they agree.
 */

export const VAT_RATE_OPTIONS = [20, 10, 0] as const
export const DEFAULT_VAT_RATE = 20

export type VatSummaryGroup = { rate: number; base: number; vat: number }

export type VatSummary = {
  base: number
  groups: VatSummaryGroup[]
  vat: number
  total: number
}

function toCents(value: number | string | { toString(): string }): number {
  const amount = typeof value === 'number' ? value : Number(value.toString())
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

function fromCents(cents: number): number {
  return cents / 100
}

export function summarizeVat(
  lines: Array<{
    total: number | string | { toString(): string }
    vatRate?: number | string | { toString(): string } | null
  }>
): VatSummary {
  const bases = new Map<number, number>()
  for (const line of lines) {
    const rate = Number(line.vatRate?.toString() ?? 0) || 0
    bases.set(rate, (bases.get(rate) ?? 0) + toCents(line.total))
  }

  const groups = [...bases.entries()]
    .sort(([left], [right]) => right - left)
    .map(([rate, baseCents]) => ({
      rate,
      baseCents,
      vatCents: Math.round((baseCents * rate) / 100 + Number.EPSILON),
    }))

  const baseCents = groups.reduce((sum, group) => sum + group.baseCents, 0)
  const vatCents = groups.reduce((sum, group) => sum + group.vatCents, 0)

  return {
    base: fromCents(baseCents),
    groups: groups.map((group) => ({
      rate: group.rate,
      base: fromCents(group.baseCents),
      vat: fromCents(group.vatCents),
    })),
    vat: fromCents(vatCents),
    total: fromCents(baseCents + vatCents),
  }
}
