import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { MONTHLY_PRICE_EUR, softwareApplicationJsonLd } from './structured-data'

describe('sitemap and robots (A2.11)', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://trademaster.rs'))
  afterEach(() => vi.unstubAllEnvs())

  it('lists the home page, the three trade pages and the legal pages on the configured domain', () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://trademaster.rs/',
      'https://trademaster.rs/za/veleprodaju',
      'https://trademaster.rs/za/preduzetnike',
      'https://trademaster.rs/za/proizvodjace',
      'https://trademaster.rs/privatnost',
      'https://trademaster.rs/uslovi',
    ])
  })

  it('keeps sign-in, the app and customer share links out of the index', () => {
    const urls = sitemap().map((entry) => entry.url).join(' ')
    expect(urls).not.toMatch(/sign-|shared|dashboard|invoices/)
    const rules = robots().rules as { allow: string; disallow: string[] }
    expect(rules.allow).toBe('/')
    expect(rules.disallow).toEqual(expect.arrayContaining(['/shared/', '/api/', '/sign-in', '/sign-up', '/invoices', '/settings']))
    expect(rules.disallow).not.toContain('/za/')
    expect(robots().sitemap).toBe('https://trademaster.rs/sitemap.xml')
  })
})

describe('structured data', () => {
  it('describes the web app with the published price and cannot break out of its script tag', () => {
    const json = softwareApplicationJsonLd({ NEXT_PUBLIC_APP_URL: 'https://trademaster.rs' } as unknown as NodeJS.ProcessEnv)
    expect(json).not.toContain('<')
    const data = JSON.parse(json)
    expect(data).toMatchObject({
      '@type': 'SoftwareApplication',
      url: 'https://trademaster.rs/',
      offers: { price: MONTHLY_PRICE_EUR, priceCurrency: 'EUR' },
    })
    expect(MONTHLY_PRICE_EUR).toBe('20')
  })
})
