import { describe, expect, it } from 'vitest'
import { clientToInvoiceFields } from './client-fill'

describe('clientToInvoiceFields', () => {
  it('copies name, PIB and address', () => {
    expect(
      clientToInvoiceFields({ name: 'Kupac DOO', pib: '123456789', address: 'Knez Mihailova 1' })
    ).toEqual({
      clientName: 'Kupac DOO',
      clientPib: '123456789',
      clientAddress: 'Knez Mihailova 1',
    })
  })

  it('turns missing optional fields into empty form values', () => {
    expect(clientToInvoiceFields({ name: 'Kupac', pib: null, address: null })).toEqual({
      clientName: 'Kupac',
      clientPib: '',
      clientAddress: '',
    })
  })
})
