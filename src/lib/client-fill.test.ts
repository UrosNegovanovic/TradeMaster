import { describe, expect, it } from 'vitest'
import { clientToInvoiceFields, findClientByName } from './client-fill'

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

describe('findClientByName', () => {
  const clients = [
    { id: '1', name: 'Kupac DOO' },
    { id: '2', name: 'Đorđe Trade' },
  ]

  it('matches ignoring case and surrounding spaces', () => {
    expect(findClientByName(clients, '  kupac doo ')?.id).toBe('1')
    expect(findClientByName(clients, 'đorđe trade')?.id).toBe('2')
  })

  it('returns undefined for new or blank names', () => {
    expect(findClientByName(clients, 'Novi kupac')).toBeUndefined()
    expect(findClientByName(clients, '   ')).toBeUndefined()
  })
})
