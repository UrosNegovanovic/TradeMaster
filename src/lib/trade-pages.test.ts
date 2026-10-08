import { describe, expect, it } from 'vitest'
import { tradePageBySlug, tradePagePath, tradePages } from './trade-pages'

const textOf = (page: (typeof tradePages)[number]) =>
  [
    page.title,
    page.description,
    page.h1,
    page.lead,
    ...page.today,
    ...page.features.flatMap((item) => [item.title, item.line]),
    ...page.faq.flatMap((item) => [item.q, item.a]),
  ].join(' ')

describe('trade pages (A2.11)', () => {
  it('has the three trades from the roadmap with unique slugs', () => {
    expect(tradePages.map((page) => page.slug)).toEqual(['veleprodaju', 'preduzetnike', 'proizvodjace'])
    expect(tradePagePath(tradePages[0])).toBe('/za/veleprodaju')
    expect(tradePageBySlug('proizvodjace')?.label).toBe('Proizvođači')
    expect(tradePageBySlug('nepostojeca')).toBeUndefined()
  })

  it('keeps titles and descriptions inside search-result lengths', () => {
    for (const page of tradePages) {
      expect(page.title.length).toBeLessThanOrEqual(60)
      expect(page.description.length).toBeGreaterThanOrEqual(70)
      expect(page.description.length).toBeLessThanOrEqual(160)
    }
  })

  it('addresses the reader with "vi"', () => {
    for (const page of tradePages) {
      expect(textOf(page)).not.toMatch(
        /\b(Skeniraj|Pošalji|Pogledaj|Registruj se|Otvori|Unesi|Prati|Pripremi|Probaj|moraš|tvoj\w*|tebi)\b/
      )
    }
  })

  it('promises nothing that does not exist yet', () => {
    for (const page of tradePages) {
      const text = textOf(page)
      expect(text).not.toMatch(/šalje(mo)? (fakture )?u SEF jednim|automatski u SEF|više korisnika|timsk|veštačk|\bAI\b|nalepnic|etiket|offline/i)
      // The SEF answer stays the honest one until A3 works in production.
      expect(page.faq.find((item) => /SEF/.test(item.q))?.a).toMatch(/^Ne\./)
    }
  })
})
