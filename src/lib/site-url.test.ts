import { describe, expect, it } from 'vitest'
import { FALLBACK_SITE_URL, absoluteUrl, siteUrl } from './site-url'

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe('siteUrl', () => {
  it('uses NEXT_PUBLIC_APP_URL as an origin, without a trailing slash or path', () => {
    expect(siteUrl(env({ NEXT_PUBLIC_APP_URL: 'https://trademaster.rs/' }))).toBe('https://trademaster.rs')
    expect(siteUrl(env({ NEXT_PUBLIC_APP_URL: ' https://www.trademaster.rs/landing ' }))).toBe('https://www.trademaster.rs')
  })

  it('falls back to the Vercel production URL, then the known one', () => {
    expect(siteUrl(env({ VERCEL_PROJECT_PRODUCTION_URL: 'trade-master.vercel.app' }))).toBe('https://trade-master.vercel.app')
    expect(siteUrl(env({}))).toBe(FALLBACK_SITE_URL)
  })

  it('ignores malformed and plain-http values (except localhost)', () => {
    expect(siteUrl(env({ NEXT_PUBLIC_APP_URL: 'not a url' }))).toBe(FALLBACK_SITE_URL)
    expect(siteUrl(env({ NEXT_PUBLIC_APP_URL: 'http://trademaster.rs' }))).toBe(FALLBACK_SITE_URL)
    expect(siteUrl(env({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }))).toBe('http://localhost:3000')
  })

  it('builds absolute URLs', () => {
    expect(absoluteUrl('/za/veleprodaju', env({ NEXT_PUBLIC_APP_URL: 'https://trademaster.rs' }))).toBe(
      'https://trademaster.rs/za/veleprodaju'
    )
    expect(absoluteUrl('uslovi', env({ NEXT_PUBLIC_APP_URL: 'https://trademaster.rs' }))).toBe('https://trademaster.rs/uslovi')
  })
})
