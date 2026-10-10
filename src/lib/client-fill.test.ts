import { describe, expect, it } from 'vitest'
import {
  clientToInvoiceFields,
  findClientByName,
  findSavedClientForInvoice,
  invoicePrefillFromClient,
  newClientFromInvoice,
  savedClientDiffers,
} from './client-fill'

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

describe('findSavedClientForInvoice', () => {
  const clients = [
    { id: '1', name: 'Kupac DOO', pib: '101134702' },
    { id: '2', name: 'Drugi kupac', pib: null },
  ]

  it('matches by PIB first, ignoring spaces', () => {
    expect(findSavedClientForInvoice(clients, { clientName: 'Stari naziv', clientPib: '101 134 702' })?.id).toBe('1')
  })

  it('falls back to the name when the PIB on the invoice is wrong or empty', () => {
    expect(findSavedClientForInvoice(clients, { clientName: 'kupac doo', clientPib: '123124129' })?.id).toBe('1')
    expect(findSavedClientForInvoice(clients, { clientName: 'Drugi kupac', clientPib: '' })?.id).toBe('2')
  })

  it('returns undefined for an unknown buyer', () => {
    expect(findSavedClientForInvoice(clients, { clientName: 'Novi', clientPib: '' })).toBeUndefined()
  })
})

describe('savedClientDiffers', () => {
  const client = { name: 'Kupac DOO', pib: '101134702', address: 'Knez Mihailova 1, 11000 Beograd' }

  it('is false when the invoice already has the saved data (spaces ignored)', () => {
    expect(
      savedClientDiffers(client, {
        clientName: ' Kupac DOO',
        clientPib: '101134702',
        clientAddress: 'Knez Mihailova 1, 11000 Beograd ',
      })
    ).toBe(false)
  })

  it('is true when the PIB or address on the invoice is different', () => {
    expect(
      savedClientDiffers(client, { clientName: 'Kupac DOO', clientPib: '123124129', clientAddress: client.address })
    ).toBe(true)
    expect(
      savedClientDiffers(client, { clientName: 'Kupac DOO', clientPib: client.pib, clientAddress: 'Knez Mihailova 1' })
    ).toBe(true)
  })
})

describe('newClientFromInvoice (ROADMAP A9.12)', () => {
  const buyer = { clientName: 'Kupac DOO', clientPib: '', clientAddress: '', registrationNumber: '' }

  it('saves a buyer with only a name', () => {
    const result = newClientFromInvoice(buyer)
    expect(result).toEqual({
      ok: true,
      data: { name: 'Kupac DOO', pib: null, registrationNumber: null, address: null, phone: null, email: null },
    })
  })

  it('asks for the matični broj when the buyer has a PIB', () => {
    const result = newClientFromInvoice({ ...buyer, clientPib: '101134702' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/matični broj/)
  })

  it('refuses an address without city, like Kupci does', () => {
    expect(newClientFromInvoice({ ...buyer, clientAddress: 'Knez Mihailova 1' }).ok).toBe(false)
  })
})

describe('invoicePrefillFromClient', () => {
  it('fills the buyer and leaves the lines to the form', () => {
    expect(invoicePrefillFromClient({ name: 'Kupac', pib: null, address: 'Ulica 1, 11000 Beograd' })).toEqual({
      clientName: 'Kupac',
      clientPib: '',
      clientAddress: 'Ulica 1, 11000 Beograd',
      items: [],
    })
  })
})
