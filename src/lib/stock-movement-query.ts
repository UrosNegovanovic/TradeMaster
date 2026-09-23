export type StockMovementListParams = {
  take?: number
  productId?: string
}

const DEFAULT_LIMIT = 50
const PREVIEW_MAX_LIMIT = 100

/**
 * Parse GET /api/stock-movements query params.
 * `all=1` or `limit=all` returns every movement for the profile (same StockMovement rows).
 */
export function parseStockMovementListParams(
  searchParams: URLSearchParams
): StockMovementListParams {
  const productId = searchParams.get('productId') || undefined
  const wantsAll =
    searchParams.get('all') === '1' || searchParams.get('limit') === 'all'

  if (wantsAll) {
    return { productId }
  }

  const parsed = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const take = Math.min(
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT,
    PREVIEW_MAX_LIMIT
  )

  return { productId, take }
}
