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
  sharedInvoice: { name: 'shared-invoice', limit: 60, windowMs: 60_000 },
  barcodeLookup: { name: 'barcode-lookup', limit: 40, windowMs: 60_000 },
  // SEF (ROADMAP A3): each call reaches the state's server with the company's own key.
  sefSend: { name: 'sef-send', limit: 20, windowMs: 60_000 },
  sefRead: { name: 'sef-read', limit: 60, windowMs: 60_000 },
  sefKey: { name: 'sef-key', limit: 10, windowMs: 60_000 },
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

function tooManyRequests(spec: RateLimitSpec, result: RateLimitResult): NextResponse {
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

export function rateLimitedResponse(request: Request, spec: RateLimitSpec): NextResponse | null {
  const result = applyRateLimit(request, spec)
  return result.ok ? null : tooManyRequests(spec, result)
}

/**
 * Shared counter on Upstash Redis (REST, no extra package) so the limit holds across serverless instances.
 * Active only when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set; Vercel KV exposes the same
 * REST API under KV_REST_API_URL / KV_REST_API_TOKEN.
 */
const SHARED_TIMEOUT_MS = 1500

function sharedStoreConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

async function consumeSharedRateLimit(
  config: { url: string; token: string },
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisKey = `tm:rl:${key}`
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    // Fixed window: INCR, set the expiry only on the first hit (NX), read what is left.
    body: JSON.stringify([
      ['INCR', redisKey],
      ['PEXPIRE', redisKey, windowMs, 'NX'],
      ['PTTL', redisKey],
    ]),
    cache: 'no-store',
    signal: AbortSignal.timeout(SHARED_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Rate limit store responded ${response.status}`)

  const data = (await response.json()) as Array<{ result?: unknown; error?: string }>
  const count = Number(data[0]?.result)
  if (!Number.isFinite(count)) throw new Error('Rate limit store returned no count')
  const ttlMs = Number(data[2]?.result)

  if (count > limit) {
    const remainingMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)) }
  }
  return { ok: true, remaining: Math.max(0, limit - count), retryAfterSec: 0 }
}

/** Shared limit when configured; on any store failure it degrades to the per-instance limiter (never blocks users). */
export async function consumeRateLimitShared(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const config = sharedStoreConfig()
  if (config) {
    try {
      return await consumeSharedRateLimit(config, key, limit, windowMs)
    } catch (error) {
      console.error('Shared rate limit unavailable, using in-memory fallback:', (error as Error).message)
    }
  }
  return consumeRateLimit(key, limit, windowMs)
}

/** Route helper: returns a 429 response when the caller is over the limit, otherwise null. */
export async function enforceRateLimit(request: Request, spec: RateLimitSpec): Promise<NextResponse | null> {
  const result = await consumeRateLimitShared(rateLimitKey(spec.name, request), spec.limit, spec.windowMs)
  return result.ok ? null : tooManyRequests(spec, result)
}

export function resetRateLimitStore() {
  store.clear()
}
