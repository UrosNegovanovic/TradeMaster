import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyRateLimit,
  consumeRateLimit,
  enforceRateLimit,
  getClientIp,
  rateLimitedResponse,
  rateLimits,
  resetRateLimitStore,
} from './rate-limit'

afterEach(() => {
  resetRateLimitStore()
})

describe('getClientIp', () => {
  it('uses the first x-forwarded-for hop', () => {
    const request = new Request('http://localhost/api/public/catalogs/x', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    })
    expect(getClientIp(request)).toBe('203.0.113.9')
  })

  it('falls back to x-real-ip then unknown', () => {
    expect(
      getClientIp(new Request('http://localhost/x', { headers: { 'x-real-ip': ' 198.51.100.4 ' } }))
    ).toBe('198.51.100.4')
    expect(getClientIp(new Request('http://localhost/x'))).toBe('unknown')
  })
})

describe('consumeRateLimit', () => {
  it('allows up to the limit then blocks until the window resets', () => {
    expect(consumeRateLimit('k', 2, 60_000)).toMatchObject({ ok: true, remaining: 1 })
    expect(consumeRateLimit('k', 2, 60_000)).toMatchObject({ ok: true, remaining: 0 })
    expect(consumeRateLimit('k', 2, 60_000)).toMatchObject({ ok: false, remaining: 0 })
  })

  it('tracks keys independently', () => {
    consumeRateLimit('a', 1, 60_000)
    expect(consumeRateLimit('a', 1, 60_000).ok).toBe(false)
    expect(consumeRateLimit('b', 1, 60_000).ok).toBe(true)
  })
})

describe('applyRateLimit', () => {
  it('keys guests by IP so one client cannot exhaust another quota', () => {
    const spec = { name: 'public-catalog', limit: 1, windowMs: 60_000 }
    const first = new Request('http://localhost/api/public/catalogs/1', {
      headers: { 'x-forwarded-for': '203.0.113.1' },
    })
    const second = new Request('http://localhost/api/public/catalogs/1', {
      headers: { 'x-forwarded-for': '203.0.113.2' },
    })
    expect(applyRateLimit(first, spec).ok).toBe(true)
    expect(applyRateLimit(first, spec).ok).toBe(false)
    expect(applyRateLimit(second, spec).ok).toBe(true)
  })
})

describe('rateLimitedResponse', () => {
  it('returns 429 JSON with Retry-After when the quota is spent', () => {
    const request = new Request('http://localhost/api/shared/catalog/t', {
      headers: { 'x-forwarded-for': '192.0.2.10' },
    })
    expect(rateLimitedResponse(request, { name: 'shared-catalog', limit: 1, windowMs: 60_000 })).toBeNull()
    const blocked = rateLimitedResponse(request, { name: 'shared-catalog', limit: 1, windowMs: 60_000 })
    expect(blocked).not.toBeNull()
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toMatch(/^\d+$/)
  })

  it('uses the launch-plan public catalog quota', () => {
    expect(rateLimits.publicCatalog.limit).toBe(60)
    expect(rateLimits.barcodeLookup.limit).toBe(40)
  })
})

describe('shared rate limit store', () => {
  const spec = { name: 'shared-catalog', limit: 2, windowMs: 60_000 }
  const request = () => new Request('http://localhost/x', { headers: { 'x-forwarded-for': '203.0.113.7' } })
  const pipeline = (count: number, ttl = 45_000) =>
    new Response(JSON.stringify([{ result: count }, { result: count === 1 ? 1 : 0 }, { result: ttl }]), { status: 200 })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('falls back to the in-memory limiter when the store is not configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await enforceRateLimit(request(), spec)).toBeNull()
    expect(await enforceRateLimit(request(), spec)).toBeNull()
    expect((await enforceRateLimit(request(), spec))?.status).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('counts in the shared store and blocks over the limit with the remaining window', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example/')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'secret')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(pipeline(1))
      .mockResolvedValueOnce(pipeline(3, 30_500))
    vi.stubGlobal('fetch', fetchMock)

    expect(await enforceRateLimit(request(), spec)).toBeNull()
    const blocked = await enforceRateLimit(request(), spec)
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBe('31')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://redis.example/pipeline')
    expect(init.headers.Authorization).toBe('Bearer secret')
    expect(JSON.parse(init.body)[0]).toEqual(['INCR', 'tm:rl:shared-catalog:203.0.113.7'])
  })

  it('never blocks users when the store fails: it degrades to the in-memory limiter', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'secret')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

    expect(await enforceRateLimit(request(), spec)).toBeNull()
    expect(await enforceRateLimit(request(), spec)).toBeNull()
    expect((await enforceRateLimit(request(), spec))?.status).toBe(429)
  })

  it('degrades on a non-OK store response too', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://kv.example')
    vi.stubEnv('KV_REST_API_TOKEN', 'secret')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })))
    expect(await enforceRateLimit(request(), spec)).toBeNull()
  })
})
