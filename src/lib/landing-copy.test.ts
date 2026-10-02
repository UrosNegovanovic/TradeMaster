import { describe, expect, it } from 'vitest'
import { MONTHLY_PRICE, PRICING_OFFER, paymentFaq, pricingIncludes, pricingNote } from './landing-copy'

describe('landing pricing copy', () => {
  it('does not promise a cancelable in-app subscription', () => {
    const blob = [...pricingIncludes, pricingNote, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).not.toMatch(/otkažite kad god/i)
    expect(blob).not.toMatch(/cancel subscription/i)
    expect(blob).toMatch(/ručno/)
    expect(blob).toMatch(/nema pretplate/i)
  })

  it('states the terms once: 60 days free, then 20 € per month, read-only after expiry', () => {
    expect(PRICING_OFFER).toBe('Prvih 60 dana besplatno, zatim 20 € mesečno')
    const blob = [...pricingIncludes, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).toContain(PRICING_OFFER)
    expect(blob).toContain(MONTHLY_PRICE)
    expect(blob).toMatch(/samo za pregled/)
    expect(blob).not.toMatch(/30 €/)
  })
})
