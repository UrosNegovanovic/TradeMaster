import { describe, expect, it } from 'vitest'
import { EARLY_ACCESS_OFFER, EARLY_ACCESS_PRICE, paymentFaq, pricingIncludes, pricingNote } from './landing-copy'

describe('landing pricing copy', () => {
  it('does not promise a cancelable in-app subscription', () => {
    const blob = [...pricingIncludes, pricingNote, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).not.toMatch(/otkažite kad god/i)
    expect(blob).not.toMatch(/cancel subscription/i)
    expect(blob).toMatch(/ručno/)
    expect(blob).toMatch(/nema pretplate/i)
  })

  it('quotes the single early-access price everywhere and calls it an introductory price', () => {
    expect(EARLY_ACCESS_OFFER).toBe('20 € za 60 dana')
    const blob = [...pricingIncludes, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).toContain(EARLY_ACCESS_PRICE)
    expect(blob).toMatch(/uvodna cena/i)
    expect(blob).not.toMatch(/30 €/)
  })
})
