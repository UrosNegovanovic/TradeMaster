import { describe, expect, it } from 'vitest'
import { demoInvoiceQrPayload, demoInvoiceTotals } from './landing-invoice-demo'

describe('landing invoice demo', () => {
  it('splits the base and PDV by rate', () => {
    expect(demoInvoiceTotals()).toEqual({
      base10: 5730,
      base20: 15380,
      vat10: 573,
      vat20: 3076,
      osnovica: 21110,
      total: 24759,
    })
  })

  it('builds a valid IPS payload from the fictional account', () => {
    expect(demoInvoiceQrPayload()).toContain('I:RSD24759,00')
  })
})
