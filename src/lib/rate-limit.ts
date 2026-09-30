import { NextResponse } from 'next/server'

export type RateLimitSpec = {
  name: string
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

type Bucket = {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()
const MAX_KEYS = 5000

export const rateLimits = {
  publicCatalog: { name: 'public-catalog', limit: 60, windowMs: 60_000 },
  sharedCatalog: { name: 'shared-catalog', limit: 60, windowMs: 60_000 },
  barcodeLookup: { name: 'barcode-lookup', limit: 40, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitSpec>

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function rateLimitKey(name: string, request: Request): string {
  return `${name}:${getClientIp(request)}`
}

function prune(now: number) {
  if (store.size < MAX_KEYS) return
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key)
  }
  if (store.size < MAX_KEYS) return
  const oldest = store.keys().next().value
  if (oldest) store.delete(oldest)
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  prune(now)
  const bucket = store.get(key)
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0 }
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }
  bucket.count += 1
  return { ok: true, remaining: Math.max(0, limit - bucket.count), retryAfterSec: 0 }
}

export function applyRateLimit(request: Request, spec: RateLimitSpec): RateLimitResult {
  return consumeRateLimit(rateLimitKey(spec.name, request), spec.limit, spec.windowMs)
}

export function rateLimitedResponse(request: Request, spec: RateLimitSpec): NextResponse | null {
  const result = applyRateLimit(request, spec)
  if (result.ok) return null
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSec),
        'X-RateLimit-Limit': String(spec.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  )
}

export function resetRateLimitStore() {
  store.clear()
}
