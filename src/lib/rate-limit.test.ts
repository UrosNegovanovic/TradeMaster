import { afterEach, describe, expect, it } from 'vitest'
import {
  applyRateLimit,
  consumeRateLimit,
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
