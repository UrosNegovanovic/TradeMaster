import { describe, expect, it } from 'vitest'
import { paymentFaq, pricingIncludes, pricingNote } from './landing-copy'

describe('landing pricing copy', () => {
  it('does not promise a cancelable in-app subscription', () => {
    const blob = [...pricingIncludes, pricingNote, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).not.toMatch(/otkažite kad god/i)
    expect(blob).not.toMatch(/cancel subscription/i)
    expect(blob).toMatch(/ručno/)
    expect(blob).toMatch(/nema pretplate/i)
  })
})
