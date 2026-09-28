export const EXTERNAL_LOOKUP_BUDGET_MS = 3500

export type BarcodeLookupResult = {
  name: string
  description: string
  imageUrl: string | null
  found: boolean
  barcode: string
  source?: 'local' | 'food' | 'beauty' | 'pet' | 'products'
  categoryId?: string | null
}

export function notFoundBarcode(barcode: string): BarcodeLookupResult {
  return {
    name: '',
    description: '',
    imageUrl: null,
    found: false,
    barcode,
  }
}

/**
 * Run catalog fetchers until one hits, or until the Vercel-safe budget is gone.
 * Remaining time is passed to each fetcher so a slow Open*Facts call cannot 500 the route.
 */
export async function firstExternalBarcodeMatch(
  barcode: string,
  fetchers: Array<(barcode: string, timeoutMs: number) => Promise<BarcodeLookupResult | null>>,
  now: () => number = Date.now,
  budgetMs = EXTERNAL_LOOKUP_BUDGET_MS
): Promise<BarcodeLookupResult | null> {
  const deadline = now() + budgetMs
  for (const fetchOne of fetchers) {
    const remaining = deadline - now()
    if (remaining <= 0) return null
    const result = await fetchOne(barcode, remaining)
    if (result?.found) return result
  }
  return null
}
