import { describe, expect, it } from 'vitest'
import {
  MONTHLY_PRICE,
  PRICING_OFFER,
  benefits,
  contactLinks,
  dataPoints,
  faqs,
  heroLead,
  installFaq,
  invoicePoints,
  landingContact,
  landingExamples,
  notList,
  paymentFaq,
  pricingIncludes,
  pricingNote,
  workflowSteps,
} from './landing-copy'
import { installButtonLabel } from './pwa-install'
import { operator } from './operator'

describe('landing pricing copy', () => {
  it('does not promise a cancelable in-app subscription', () => {
    const blob = [...pricingIncludes, pricingNote, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).not.toMatch(/otkažite kad god/i)
    expect(blob).not.toMatch(/cancel subscription/i)
    expect(blob).toMatch(/ručno/)
    expect(blob).toMatch(/nema pretplate/i)
  })

  it('states the terms once: 60 days free, then 20 € per month, read-only after expiry', () => {
    expect(PRICING_OFFER).toBe('Prvih 60 dana besplatno, zatim 20 € mesečno')
    const blob = [...pricingIncludes, paymentFaq.q, paymentFaq.a].join(' ')
    expect(blob).toContain(PRICING_OFFER)
    expect(blob).toContain(MONTHLY_PRICE)
    expect(blob).toMatch(/samo za pregled/)
    expect(blob).not.toMatch(/30 €/)
  })
})

describe('landing page copy (A2.9)', () => {
  const allText = [
    heroLead,
    ...benefits.flatMap((item) => [item.title, item.line]),
    ...workflowSteps.flatMap((item) => [item.title, item.line]),
    ...invoicePoints,
    ...notList,
    ...dataPoints,
    ...pricingIncludes,
    ...faqs.flatMap((item) => [item.q, item.a]),
  ].join(' ')

  it('addresses the reader with "vi", never "ti"', () => {
    expect(allText).not.toMatch(
      /\b(Skeniraj|Pošalji|Pogledaj|Registruj se|Otvori|Unesi|Prati|Pripremi|Probaj|Tapni|Izaberi|moraš|uneseš|pošalješ|Pripremiš|tvoj\w*|tebi)\b/
    )
  })

  it('tells the whole loop in six steps, ending with the IPS QR payment', () => {
    expect(workflowSteps).toHaveLength(6)
    expect(workflowSteps[0].title).toMatch(/Skenirajte/)
    expect(workflowSteps[5].line).toMatch(/IPS QR/)
  })

  it('lists predračun and otpremnica in the package and states the limits', () => {
    expect(pricingIncludes.join(' ')).toMatch(/Predračun.*otpremnica/)
    expect(notList.join(' ')).toMatch(/fiskalna kasa/)
    expect(notList.join(' ')).toMatch(/Ne šalje fakture u SEF/)
    expect(dataPoints.join(' ')).toMatch(/EU \(Irska\)/)
  })

  it('does not promise features that do not exist yet', () => {
    expect(allText).not.toMatch(/šalje(mo)? (fakture )?u SEF jednim|automatski u SEF|više korisnika|tim(ski)? nalog|veštačk|\bAI\b|offline radi/i)
  })

  it('names the install buttons exactly as the app shows them', () => {
    expect(installFaq.a).toContain(`„${installButtonLabel(false)}“`)
    expect(installFaq.a).toContain(`„${installButtonLabel(true)}“`)
  })

  it('takes the support phone from operator.ts and keeps example buttons hidden until set', () => {
    expect(landingContact.phone).toBe(operator.phone)
    expect(contactLinks(landingContact.phone)).not.toBeNull()
    expect(landingExamples).toEqual({ catalogPath: null, invoicePath: null })
  })
})

describe('contactLinks', () => {
  it('builds tel, WhatsApp and Viber links from a Serbian number', () => {
    expect(contactLinks('+381 62 123 4567')).toEqual({
      display: '+381 62 123 4567',
      tel: 'tel:+381621234567',
      whatsapp: 'https://wa.me/381621234567',
      viber: 'viber://chat?number=%2B381621234567',
    })
    expect(contactLinks('062/123-4567')?.whatsapp).toBe('https://wa.me/381621234567')
  })

  it('builds the links for the operator phone', () => {
    expect(contactLinks('+381628372900')).toEqual({
      display: '+381628372900',
      tel: 'tel:+381628372900',
      whatsapp: 'https://wa.me/381628372900',
      viber: 'viber://chat?number=%2B381628372900',
    })
  })

  it('returns null for a missing or broken number', () => {
    expect(contactLinks(null)).toBeNull()
    expect(contactLinks('12345')).toBeNull()
  })
})
