import { describe, expect, it } from 'vitest'
import { NON_VAT_NOTE, invoicePdfFacts } from './invoice-pdf-facts'

const base = { createdAt: '2026-10-09T10:00:00.000Z', sellerAddress: 'Knez Mihailova 1, 11000 Beograd' }

describe('invoicePdfFacts', () => {
  it('takes the place of issue from the seller city and uses the issue date as datum prometa', () => {
    const facts = invoicePdfFacts({ ...base, vatEnabled: true, sellerInVatSystem: true })
    expect(facts.issuePlace).toBe('Beograd')
    expect(facts.supplyDate?.toISOString()).toBe('2026-10-09T10:00:00.000Z')
    expect(facts.nonVatNote).toBeNull()
  })

  it('has no datum prometa on a predračun', () => {
    expect(invoicePdfFacts({ ...base, documentType: 'PROFORMA' }).supplyDate).toBeNull()
  })

  it('prints the non-PDV note only for a seller outside PDV', () => {
    expect(invoicePdfFacts({ ...base, vatEnabled: false, sellerInVatSystem: false }).nonVatNote).toBe(NON_VAT_NOTE)
    // An old invoice of a PDV seller (issued before PDV support) must not claim the seller is outside PDV.
    expect(invoicePdfFacts({ ...base, vatEnabled: false, sellerInVatSystem: true }).nonVatNote).toBeNull()
    expect(invoicePdfFacts({ ...base, vatEnabled: false }).nonVatNote).toBeNull()
  })

  it('leaves the place empty when the address has no city', () => {
    expect(invoicePdfFacts({ ...base, sellerAddress: 'Knez Mihailova 1' }).issuePlace).toBeNull()
    expect(invoicePdfFacts({ ...base, sellerAddress: null }).issuePlace).toBeNull()
  })
})
