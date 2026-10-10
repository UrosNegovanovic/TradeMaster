import { describe, expect, it } from 'vitest'
import { billingMailto, billingRequestText, billingWhatsApp } from './billing-request'
import { operator } from './operator'

describe('billing request (manual billing)', () => {
  const profile = { companyName: 'Firma DOO', pib: '101134702' }

  it('names the company and PIB', () => {
    expect(billingRequestText(profile)).toBe('Pozdrav, molim predračun za TradeMaster pretplatu za sledeći mesec za Firma DOO, PIB 101134702. Hvala!')
    expect(billingRequestText(null)).toContain('za moja firma.')
  })

  it('opens an e-mail to the operator with subject and body', () => {
    const url = billingMailto(profile)
    expect(url.startsWith(`mailto:${operator.email}?subject=`)).toBe(true)
    expect(decodeURIComponent(url.split('body=')[1])).toContain('Firma DOO')
  })

  it('opens WhatsApp to the operator phone with the message', () => {
    expect(billingWhatsApp(profile)).toMatch(/^https:\/\/wa\.me\/\d+\?text=Pozdrav/)
  })
})
